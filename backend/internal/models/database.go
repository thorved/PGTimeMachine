package models

import (
	"time"
)

// DatabaseConnection represents a PostgreSQL database connection configuration
type DatabaseConnection struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name" binding:"required"`
	Host      string    `json:"host" db:"host" binding:"required"`
	Port      int       `json:"port" db:"port" binding:"required"`
	Database  string    `json:"database" db:"database" binding:"required"`
	Username  string    `json:"username" db:"username" binding:"required"`
	Password  string    `json:"password" db:"password" binding:"required"`
	SSLMode   string    `json:"ssl_mode" db:"ssl_mode"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Snapshot represents a database snapshot/backup
type Snapshot struct {
	ID           string     `json:"id" db:"id"`
	DatabaseID   string     `json:"database_id" db:"database_id" binding:"required"`
	Name         string     `json:"name" db:"name" binding:"required"`
	Description  string     `json:"description" db:"description"`
	FilePath     string     `json:"file_path" db:"file_path"`
	FileSize     int64      `json:"file_size" db:"file_size"`
	Status       string     `json:"status" db:"status"` // creating, completed, failed, restoring
	ErrorMessage string     `json:"error_message" db:"error_message"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	CompletedAt  *time.Time `json:"completed_at" db:"completed_at"`
}

// RestoreOperation represents a database restore operation
type RestoreOperation struct {
	ID           string     `json:"id" db:"id"`
	SnapshotID   string     `json:"snapshot_id" db:"snapshot_id" binding:"required"`
	DatabaseID   string     `json:"database_id" db:"database_id" binding:"required"`
	TargetDBName string     `json:"target_db_name" db:"target_db_name"`
	Status       string     `json:"status" db:"status"` // pending, in_progress, completed, failed
	ErrorMessage string     `json:"error_message" db:"error_message"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	CompletedAt  *time.Time `json:"completed_at" db:"completed_at"`
}

// DatabaseInfo represents basic database information
type DatabaseInfo struct {
	Name    string   `json:"name"`
	Size    string   `json:"size"`
	Tables  int      `json:"tables"`
	Schemas []string `json:"schemas"`
}

// SnapshotRequest represents a request to create a snapshot
type SnapshotRequest struct {
	DatabaseID  string `json:"database_id" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// RestoreRequest represents a request to restore from a snapshot
type RestoreRequest struct {
	SnapshotID   string `json:"snapshot_id" binding:"required"`
	DatabaseID   string `json:"database_id" binding:"required"`
	TargetDBName string `json:"target_db_name"`
}

// SnapshotProgress represents the progress of a snapshot operation
type SnapshotProgress struct {
	SnapshotID string     `json:"snapshot_id"`
	Status     string     `json:"status"`   // in_progress, completed, failed, not_found
	Progress   int        `json:"progress"` // 0-100
	Message    string     `json:"message"`
	FileSize   int64      `json:"file_size,omitempty"`
	StartedAt  *time.Time `json:"started_at,omitempty"`
}

// API Response models
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}
