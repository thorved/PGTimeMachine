package services

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

// PostgreSQLToolsService handles PostgreSQL client tools detection and validation
type PostgreSQLToolsService struct {
	pgDumpPath string
	psqlPath   string
}

// NewPostgreSQLToolsService creates a new PostgreSQL tools service
func NewPostgreSQLToolsService() *PostgreSQLToolsService {
	return &PostgreSQLToolsService{}
}

// ValidateTools checks if required PostgreSQL client tools are available
func (pts *PostgreSQLToolsService) ValidateTools() error {
	// Check for pg_dump
	pgDumpPath, err := pts.findTool("pg_dump")
	if err != nil {
		return fmt.Errorf("pg_dump not found: %w\n\nPlease install PostgreSQL client tools:\n%s", err, pts.getInstallInstructions())
	}
	pts.pgDumpPath = pgDumpPath

	// Check for psql
	psqlPath, err := pts.findTool("psql")
	if err != nil {
		return fmt.Errorf("psql not found: %w\n\nPlease install PostgreSQL client tools:\n%s", err, pts.getInstallInstructions())
	}
	pts.psqlPath = psqlPath

	return nil
}

// findTool attempts to locate a PostgreSQL tool in the system PATH
func (pts *PostgreSQLToolsService) findTool(toolName string) (string, error) {
	// On Windows, try both with and without .exe extension
	if runtime.GOOS == "windows" {
		if !strings.HasSuffix(toolName, ".exe") {
			toolName += ".exe"
		}
	}

	path, err := exec.LookPath(toolName)
	if err != nil {
		return "", fmt.Errorf("tool '%s' not found in PATH", toolName)
	}

	return path, nil
}

// getInstallInstructions returns platform-specific installation instructions
func (pts *PostgreSQLToolsService) getInstallInstructions() string {
	switch runtime.GOOS {
	case "windows":
		return `Windows Installation:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Or use Chocolatey: choco install postgresql
3. Or use Scoop: scoop install postgresql
4. Make sure PostgreSQL bin directory is in your PATH`

	case "darwin":
		return `macOS Installation:
1. Using Homebrew: brew install postgresql
2. Using MacPorts: sudo port install postgresql14
3. Download from: https://www.postgresql.org/download/macosx/`

	case "linux":
		return `Linux Installation:
Ubuntu/Debian: sudo apt-get install postgresql-client
CentOS/RHEL: sudo yum install postgresql
Fedora: sudo dnf install postgresql
Arch: sudo pacman -S postgresql`

	default:
		return `Please install PostgreSQL client tools for your operating system.
Visit: https://www.postgresql.org/download/`
	}
}

// GetPgDumpPath returns the path to pg_dump
func (pts *PostgreSQLToolsService) GetPgDumpPath() string {
	if pts.pgDumpPath != "" {
		return pts.pgDumpPath
	}
	return "pg_dump" // fallback to system PATH
}

// GetPsqlPath returns the path to psql
func (pts *PostgreSQLToolsService) GetPsqlPath() string {
	if pts.psqlPath != "" {
		return pts.psqlPath
	}
	return "psql" // fallback to system PATH
}

// TestToolVersions gets version information for debugging
func (pts *PostgreSQLToolsService) TestToolVersions() (map[string]string, error) {
	versions := make(map[string]string)

	// Test pg_dump version
	if pgDumpCmd := exec.Command(pts.GetPgDumpPath(), "--version"); pgDumpCmd != nil {
		if output, err := pgDumpCmd.Output(); err == nil {
			versions["pg_dump"] = strings.TrimSpace(string(output))
		} else {
			versions["pg_dump"] = fmt.Sprintf("Error: %v", err)
		}
	}

	// Test psql version
	if psqlCmd := exec.Command(pts.GetPsqlPath(), "--version"); psqlCmd != nil {
		if output, err := psqlCmd.Output(); err == nil {
			versions["psql"] = strings.TrimSpace(string(output))
		} else {
			versions["psql"] = fmt.Sprintf("Error: %v", err)
		}
	}

	return versions, nil
}
