package services

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"PGTimeMachine-Backend/internal/models"

	"github.com/google/uuid"
)

type SnapshotService struct {
	dbService    *DatabaseService
	toolsService *PostgreSQLToolsService
	backupDir    string
}

func NewSnapshotService(dbService *DatabaseService) *SnapshotService {
	backupDir := os.Getenv("BACKUP_DIR")
	if backupDir == "" {
		backupDir = "./backups"
	}

	// Create backup directory if it doesn't exist
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		log.Printf("Warning: Failed to create backup directory: %v", err)
	}

	// Initialize PostgreSQL tools service
	toolsService := NewPostgreSQLToolsService()
	if err := toolsService.ValidateTools(); err != nil {
		log.Printf("Warning: PostgreSQL tools validation failed: %v", err)
		// Continue execution - tools might still work from PATH
	}

	return &SnapshotService{
		dbService:    dbService,
		toolsService: toolsService,
		backupDir:    backupDir,
	}
}

// CreateSnapshot creates a new database snapshot using pg_dump
func (ss *SnapshotService) CreateSnapshot(config *models.DatabaseConnection, request *models.SnapshotRequest) (*models.Snapshot, error) {
	snapshot := &models.Snapshot{
		ID:          uuid.New().String(),
		DatabaseID:  request.DatabaseID,
		Name:        request.Name,
		Description: request.Description,
		Status:      "creating",
		CreatedAt:   time.Now(),
	}

	// Generate filename
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("%s_%s_%s.sql", strings.ReplaceAll(config.Database, " ", "_"), timestamp, snapshot.ID[:8])
	snapshot.FilePath = filepath.Join(ss.backupDir, filename)

	// Start backup process in goroutine
	go ss.performBackup(config, snapshot)

	return snapshot, nil
}

// performBackup executes the actual pg_dump command
func (ss *SnapshotService) performBackup(config *models.DatabaseConnection, snapshot *models.Snapshot) {
	log.Printf("Starting backup for snapshot %s", snapshot.ID)

	// Build pg_dump command
	args := []string{
		fmt.Sprintf("--host=%s", config.Host),
		fmt.Sprintf("--port=%d", config.Port),
		fmt.Sprintf("--username=%s", config.Username),
		fmt.Sprintf("--dbname=%s", config.Database),
		"--verbose",
		"--clean",
		"--if-exists",
		"--create",
		"--no-password",
		fmt.Sprintf("--file=%s", snapshot.FilePath),
	}

	cmd := exec.Command(ss.toolsService.GetPgDumpPath(), args...)

	// Set password via environment variable
	cmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", config.Password))

	// Execute the command
	output, err := cmd.CombinedOutput()
	if err != nil {
		snapshot.Status = "failed"
		snapshot.ErrorMessage = fmt.Sprintf("pg_dump failed: %v\nOutput: %s", err, string(output))
		log.Printf("Backup failed for snapshot %s: %v", snapshot.ID, err)
		return
	}

	// Get file size
	fileInfo, err := os.Stat(snapshot.FilePath)
	if err != nil {
		snapshot.Status = "failed"
		snapshot.ErrorMessage = fmt.Sprintf("Failed to get file info: %v", err)
		log.Printf("Failed to get file info for snapshot %s: %v", snapshot.ID, err)
		return
	}

	// Update snapshot status
	snapshot.FileSize = fileInfo.Size()
	snapshot.Status = "completed"
	now := time.Now()
	snapshot.CompletedAt = &now

	log.Printf("Backup completed for snapshot %s (%.2f MB)", snapshot.ID, float64(snapshot.FileSize)/(1024*1024))
}

// RestoreSnapshot restores a database from a snapshot using psql
func (ss *SnapshotService) RestoreSnapshot(config *models.DatabaseConnection, request *models.RestoreRequest) (*models.RestoreOperation, error) {
	operation := &models.RestoreOperation{
		ID:         uuid.New().String(),
		SnapshotID: request.SnapshotID,
		DatabaseID: request.DatabaseID,
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// Set target database name
	if request.TargetDBName != "" {
		operation.TargetDBName = request.TargetDBName
	} else {
		operation.TargetDBName = config.Database + "_restored_" + time.Now().Format("20060102_150405")
	}

	// Start restore process in goroutine
	go ss.performRestore(config, operation, request.SnapshotID)

	return operation, nil
}

// performRestore executes the actual psql restore command
func (ss *SnapshotService) performRestore(config *models.DatabaseConnection, operation *models.RestoreOperation, snapshotID string) {
	log.Printf("Starting restore for operation %s", operation.ID)
	operation.Status = "in_progress"

	// Find snapshot file (in a real app, you'd query from database)
	snapshotFile := ss.findSnapshotFile(snapshotID)
	if snapshotFile == "" {
		operation.Status = "failed"
		operation.ErrorMessage = fmt.Sprintf("Snapshot file not found for ID: %s", snapshotID)
		log.Printf("Restore failed for operation %s: snapshot file not found", operation.ID)
		return
	}

	// First, create the target database
	if err := ss.createDatabase(config, operation.TargetDBName); err != nil {
		operation.Status = "failed"
		operation.ErrorMessage = fmt.Sprintf("Failed to create target database: %v", err)
		log.Printf("Restore failed for operation %s: %v", operation.ID, err)
		return
	}

	// Build psql command to restore
	args := []string{
		fmt.Sprintf("--host=%s", config.Host),
		fmt.Sprintf("--port=%d", config.Port),
		fmt.Sprintf("--username=%s", config.Username),
		fmt.Sprintf("--dbname=%s", operation.TargetDBName),
		"--verbose",
		"--no-password",
		fmt.Sprintf("--file=%s", snapshotFile),
	}

	cmd := exec.Command(ss.toolsService.GetPsqlPath(), args...)

	// Set password via environment variable
	cmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", config.Password))

	// Execute the command
	output, err := cmd.CombinedOutput()
	if err != nil {
		operation.Status = "failed"
		operation.ErrorMessage = fmt.Sprintf("psql restore failed: %v\nOutput: %s", err, string(output))
		log.Printf("Restore failed for operation %s: %v", operation.ID, err)
		return
	}

	// Update operation status
	operation.Status = "completed"
	now := time.Now()
	operation.CompletedAt = &now

	log.Printf("Restore completed for operation %s", operation.ID)
}

// createDatabase creates a new database
func (ss *SnapshotService) createDatabase(config *models.DatabaseConnection, dbName string) error {
	// Connect to postgres database to create new database
	adminConfig := *config
	adminConfig.Database = "postgres"

	db, err := ss.dbService.EstablishConnection(&adminConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to admin database: %w", err)
	}

	// Create database
	query := fmt.Sprintf("CREATE DATABASE %s", dbName)
	_, err = db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}

	return nil
}

// findSnapshotFile finds the snapshot file by ID (simplified implementation)
func (ss *SnapshotService) findSnapshotFile(snapshotID string) string {
	files, err := filepath.Glob(filepath.Join(ss.backupDir, "*_"+snapshotID[:8]+".sql"))
	if err != nil || len(files) == 0 {
		return ""
	}
	return files[0]
}

// ListSnapshots returns a list of snapshots (simplified implementation)
func (ss *SnapshotService) ListSnapshots(databaseID string) ([]*models.Snapshot, error) {
	var snapshots []*models.Snapshot

	// Read the backup directory
	files, err := os.ReadDir(ss.backupDir)
	if err != nil {
		if os.IsNotExist(err) {
			// Directory doesn't exist, return empty list
			return snapshots, nil
		}
		return nil, fmt.Errorf("failed to read backup directory: %w", err)
	}

	// Process each .sql file
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".sql") {
			continue
		}

		filePath := filepath.Join(ss.backupDir, file.Name())
		fileInfo, err := file.Info()
		if err != nil {
			log.Printf("Failed to get file info for %s: %v", file.Name(), err)
			continue
		}

		// Parse filename to extract information
		// Expected format: database_timestamp_snapshotID.sql
		parts := strings.Split(strings.TrimSuffix(file.Name(), ".sql"), "_")
		if len(parts) < 3 {
			log.Printf("Skipping file with unexpected format: %s", file.Name())
			continue
		}

		snapshotID := parts[len(parts)-1]                   // Last part is snapshot ID
		database := strings.Join(parts[:len(parts)-2], "_") // All parts except timestamp and ID
		timestamp := parts[len(parts)-2]                    // Second to last is timestamp

		// Parse timestamp for created_at
		createdAt, err := time.Parse("20060102_150405", timestamp)
		if err != nil {
			// Fallback to file modification time
			createdAt = fileInfo.ModTime()
		}

		// Determine status based on file size and age
		status := "completed"
		errorMessage := ""

		// If file was modified very recently, it might still be creating
		if time.Since(fileInfo.ModTime()) < time.Minute*2 && fileInfo.Size() < 1024 {
			status = "creating"
		}

		// Check if file seems corrupted (too small for a real backup)
		if fileInfo.Size() < 100 && time.Since(fileInfo.ModTime()) > time.Minute*5 {
			status = "failed"
			errorMessage = "Backup file appears to be incomplete or corrupted"
		}

		snapshot := &models.Snapshot{
			ID:           snapshotID,
			DatabaseID:   databaseID,
			Name:         fmt.Sprintf("Backup of %s", database),
			Description:  fmt.Sprintf("Created on %s", createdAt.Format("2006-01-02 15:04:05")),
			FilePath:     filePath,
			FileSize:     fileInfo.Size(),
			Status:       status,
			ErrorMessage: errorMessage,
			CreatedAt:    createdAt,
		}

		// Set completion time if completed
		if status == "completed" {
			completedAt := fileInfo.ModTime()
			snapshot.CompletedAt = &completedAt
		}

		snapshots = append(snapshots, snapshot)
	}

	// Sort by creation date (newest first)
	for i := 0; i < len(snapshots)-1; i++ {
		for j := i + 1; j < len(snapshots); j++ {
			if snapshots[i].CreatedAt.Before(snapshots[j].CreatedAt) {
				snapshots[i], snapshots[j] = snapshots[j], snapshots[i]
			}
		}
	}

	return snapshots, nil
}

// GetSnapshot retrieves a specific snapshot by ID
func (ss *SnapshotService) GetSnapshot(snapshotID string) (*models.Snapshot, error) {
	// Find the snapshot file
	snapshotFile := ss.findSnapshotFile(snapshotID)
	if snapshotFile == "" {
		return nil, fmt.Errorf("snapshot not found: %s", snapshotID)
	}

	// Get file info
	fileInfo, err := os.Stat(snapshotFile)
	if err != nil {
		return nil, fmt.Errorf("failed to get snapshot file info: %w", err)
	}

	// Parse filename to extract information
	fileName := filepath.Base(snapshotFile)
	parts := strings.Split(strings.TrimSuffix(fileName, ".sql"), "_")
	if len(parts) < 3 {
		return nil, fmt.Errorf("invalid snapshot filename format: %s", fileName)
	}

	database := strings.Join(parts[:len(parts)-2], "_")
	timestamp := parts[len(parts)-2]

	// Parse timestamp
	createdAt, err := time.Parse("20060102_150405", timestamp)
	if err != nil {
		createdAt = fileInfo.ModTime()
	}

	// Determine status
	status := "completed"
	errorMessage := ""

	if time.Since(fileInfo.ModTime()) < time.Minute*2 && fileInfo.Size() < 1024 {
		status = "creating"
	}

	if fileInfo.Size() < 100 && time.Since(fileInfo.ModTime()) > time.Minute*5 {
		status = "failed"
		errorMessage = "Backup file appears to be incomplete or corrupted"
	}

	snapshot := &models.Snapshot{
		ID:           snapshotID,
		DatabaseID:   "", // We don't have database ID from filename
		Name:         fmt.Sprintf("Backup of %s", database),
		Description:  fmt.Sprintf("Created on %s", createdAt.Format("2006-01-02 15:04:05")),
		FilePath:     snapshotFile,
		FileSize:     fileInfo.Size(),
		Status:       status,
		ErrorMessage: errorMessage,
		CreatedAt:    createdAt,
	}

	if status == "completed" {
		completedAt := fileInfo.ModTime()
		snapshot.CompletedAt = &completedAt
	}

	return snapshot, nil
}

// DeleteSnapshot deletes a snapshot and its associated file
func (ss *SnapshotService) DeleteSnapshot(snapshotID string) error {
	// Find and delete the snapshot file
	snapshotFile := ss.findSnapshotFile(snapshotID)
	if snapshotFile != "" {
		if err := os.Remove(snapshotFile); err != nil {
			return fmt.Errorf("failed to delete snapshot file: %w", err)
		}
	}

	// In a real application, you would also delete from database
	log.Printf("Deleted snapshot %s", snapshotID)
	return nil
}

// GetSnapshotProgress returns the current progress of a snapshot operation
func (ss *SnapshotService) GetSnapshotProgress(snapshotID string) (*models.SnapshotProgress, error) {
	// Find the snapshot file
	snapshotFile := ss.findSnapshotFile(snapshotID)
	if snapshotFile == "" {
		return &models.SnapshotProgress{
			SnapshotID: snapshotID,
			Status:     "not_found",
			Progress:   0,
			Message:    "Snapshot not found",
		}, nil
	}

	// Get file stats to estimate progress
	stat, err := os.Stat(snapshotFile)
	if err != nil {
		// File doesn't exist yet, might be starting
		return &models.SnapshotProgress{
			SnapshotID: snapshotID,
			Status:     "in_progress",
			Progress:   5,
			Message:    "Initializing backup...",
		}, nil
	}

	// Estimate progress based on file size and time
	fileSize := stat.Size()
	modTime := stat.ModTime()

	// Simple progress estimation based on time elapsed
	elapsed := time.Since(modTime)
	if elapsed < time.Minute*1 {
		// First minute - show growing progress
		progress := int(elapsed.Seconds() * 100 / 60) // 0-100% over 1 minute
		if progress > 95 {
			progress = 95 // Cap at 95% until completion
		}
		return &models.SnapshotProgress{
			SnapshotID: snapshotID,
			Status:     "in_progress",
			Progress:   progress,
			Message:    fmt.Sprintf("Creating backup... (%d bytes)", fileSize),
		}, nil
	}

	// If file hasn't been modified recently, assume it's complete
	return &models.SnapshotProgress{
		SnapshotID: snapshotID,
		Status:     "completed",
		Progress:   100,
		Message:    fmt.Sprintf("Backup completed (%d bytes)", fileSize),
	}, nil
}
