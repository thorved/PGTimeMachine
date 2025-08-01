package controllers

import (
	"net/http"

	"PGTimeMachine-Backend/internal/models"
	"PGTimeMachine-Backend/internal/services"

	"github.com/gin-gonic/gin"
)

type SystemController struct {
	toolsService *services.PostgreSQLToolsService
}

func NewSystemController() *SystemController {
	return &SystemController{
		toolsService: services.NewPostgreSQLToolsService(),
	}
}

// HealthCheck provides system health information
func (sc *SystemController) HealthCheck(c *gin.Context) {
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": nil,
		"services":  make(map[string]interface{}),
	}

	// Check PostgreSQL tools
	if err := sc.toolsService.ValidateTools(); err != nil {
		health["status"] = "degraded"
		health["services"].(map[string]interface{})["postgresql_tools"] = map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		}
	} else {
		// Get tool versions
		if versions, err := sc.toolsService.TestToolVersions(); err == nil {
			health["services"].(map[string]interface{})["postgresql_tools"] = map[string]interface{}{
				"status":   "healthy",
				"versions": versions,
			}
		}
	}

	// Always return 200 OK for health checks, use status field to indicate health
	statusCode := http.StatusOK
	success := health["status"] == "healthy"

	c.JSON(statusCode, models.APIResponse{
		Success: success,
		Message: "System health check",
		Data:    health,
	})
}

// GetSystemInfo provides detailed system information
func (sc *SystemController) GetSystemInfo(c *gin.Context) {
	info := map[string]interface{}{
		"application": map[string]string{
			"name":    "PostgreSQL Time Machine",
			"version": "1.0.0",
		},
		"postgresql_tools": make(map[string]interface{}),
	}

	// Validate tools
	if err := sc.toolsService.ValidateTools(); err != nil {
		info["postgresql_tools"] = map[string]interface{}{
			"available": false,
			"error":     err.Error(),
			"paths": map[string]string{
				"pg_dump": sc.toolsService.GetPgDumpPath(),
				"psql":    sc.toolsService.GetPsqlPath(),
			},
		}
	} else {
		// Get versions
		versions, _ := sc.toolsService.TestToolVersions()
		info["postgresql_tools"] = map[string]interface{}{
			"available": true,
			"versions":  versions,
			"paths": map[string]string{
				"pg_dump": sc.toolsService.GetPgDumpPath(),
				"psql":    sc.toolsService.GetPsqlPath(),
			},
		}
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "System information",
		Data:    info,
	})
}
