package controllers

import (
	"net/http"

	"PGTimeMachine-Backend/internal/models"
	"PGTimeMachine-Backend/internal/services"

	"github.com/gin-gonic/gin"
)

type DatabaseController struct {
	dbService *services.DatabaseService
}

func NewDatabaseController(dbService *services.DatabaseService) *DatabaseController {
	return &DatabaseController{
		dbService: dbService,
	}
}

// TestConnection tests a database connection
func (dc *DatabaseController) TestConnection(c *gin.Context) {
	var config models.DatabaseConnection
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request body",
			Error:   err.Error(),
		})
		return
	}

	if err := dc.dbService.TestConnection(&config); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Connection test failed",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Connection test successful",
	})
}

// SaveConnection saves a database connection
func (dc *DatabaseController) SaveConnection(c *gin.Context) {
	var config models.DatabaseConnection
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request body",
			Error:   err.Error(),
		})
		return
	}

	savedConfig, err := dc.dbService.SaveConnection(&config)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Failed to save connection",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Connection saved successfully",
		Data:    savedConfig,
	})
}

// GetDatabaseInfo retrieves database information
func (dc *DatabaseController) GetDatabaseInfo(c *gin.Context) {
	var config models.DatabaseConnection
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request body",
			Error:   err.Error(),
		})
		return
	}

	info, err := dc.dbService.GetDatabaseInfo(&config)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Failed to get database info",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Database info retrieved successfully",
		Data:    info,
	})
}
