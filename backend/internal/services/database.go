package services

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"PGTimeMachine-Backend/internal/models"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

type DatabaseService struct {
	connections map[string]*sql.DB
}

func NewDatabaseService() *DatabaseService {
	return &DatabaseService{
		connections: make(map[string]*sql.DB),
	}
}

// TestConnection tests if a database connection is valid
func (ds *DatabaseService) TestConnection(config *models.DatabaseConnection) error {
	connStr := ds.buildConnectionString(config)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to open connection: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	return nil
}

// SaveConnection saves a database connection configuration
func (ds *DatabaseService) SaveConnection(config *models.DatabaseConnection) (*models.DatabaseConnection, error) {
	if config.ID == "" {
		config.ID = uuid.New().String()
	}
	config.CreatedAt = time.Now()
	config.UpdatedAt = time.Now()

	// Test connection before saving
	if err := ds.TestConnection(config); err != nil {
		return nil, fmt.Errorf("connection test failed: %w", err)
	}

	// In a real application, you would save this to a configuration database
	// For now, we'll just validate and return
	log.Printf("Saved database connection: %s", config.Name)

	return config, nil
}

// GetConnection retrieves a database connection
func (ds *DatabaseService) GetConnection(id string) (*sql.DB, error) {
	if db, exists := ds.connections[id]; exists {
		return db, nil
	}

	return nil, fmt.Errorf("connection not found: %s", id)
}

// EstablishConnection creates and caches a database connection
func (ds *DatabaseService) EstablishConnection(config *models.DatabaseConnection) (*sql.DB, error) {
	connStr := ds.buildConnectionString(config)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open connection: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Cache the connection
	ds.connections[config.ID] = db

	return db, nil
}

// GetDatabaseInfo retrieves basic information about the database
func (ds *DatabaseService) GetDatabaseInfo(config *models.DatabaseConnection) (*models.DatabaseInfo, error) {
	db, err := ds.EstablishConnection(config)
	if err != nil {
		return nil, err
	}

	info := &models.DatabaseInfo{
		Name: config.Database,
	}

	// Get database size
	var size string
	sizeQuery := `SELECT pg_size_pretty(pg_database_size($1))`
	err = db.QueryRow(sizeQuery, config.Database).Scan(&size)
	if err != nil {
		log.Printf("Failed to get database size: %v", err)
		size = "Unknown"
	}
	info.Size = size

	// Get table count
	var tableCount int
	tableQuery := `
		SELECT COUNT(*) 
		FROM information_schema.tables 
		WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
	`
	err = db.QueryRow(tableQuery).Scan(&tableCount)
	if err != nil {
		log.Printf("Failed to get table count: %v", err)
		tableCount = 0
	}
	info.Tables = tableCount

	// Get schemas
	schemaQuery := `
		SELECT schema_name 
		FROM information_schema.schemata 
		WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
		ORDER BY schema_name
	`
	rows, err := db.Query(schemaQuery)
	if err != nil {
		log.Printf("Failed to get schemas: %v", err)
		info.Schemas = []string{}
	} else {
		defer rows.Close()
		var schemas []string
		for rows.Next() {
			var schema string
			if err := rows.Scan(&schema); err == nil {
				schemas = append(schemas, schema)
			}
		}
		info.Schemas = schemas
	}

	return info, nil
}

// CloseConnection closes and removes a cached connection
func (ds *DatabaseService) CloseConnection(id string) error {
	if db, exists := ds.connections[id]; exists {
		if err := db.Close(); err != nil {
			return err
		}
		delete(ds.connections, id)
	}
	return nil
}

// CloseAllConnections closes all cached connections
func (ds *DatabaseService) CloseAllConnections() {
	for id, db := range ds.connections {
		if err := db.Close(); err != nil {
			log.Printf("Error closing connection %s: %v", id, err)
		}
		delete(ds.connections, id)
	}
}

// buildConnectionString constructs a PostgreSQL connection string
func (ds *DatabaseService) buildConnectionString(config *models.DatabaseConnection) string {
	sslMode := config.SSLMode
	if sslMode == "" {
		sslMode = "disable"
	}

	var parts []string
	parts = append(parts, fmt.Sprintf("host=%s", config.Host))
	parts = append(parts, fmt.Sprintf("port=%d", config.Port))
	parts = append(parts, fmt.Sprintf("user=%s", config.Username))
	parts = append(parts, fmt.Sprintf("password=%s", config.Password))
	parts = append(parts, fmt.Sprintf("dbname=%s", config.Database))
	parts = append(parts, fmt.Sprintf("sslmode=%s", sslMode))

	return strings.Join(parts, " ")
}
