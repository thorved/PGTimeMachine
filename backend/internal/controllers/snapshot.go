package controllers

import (
	"net/http"

	"PGTimeMachine-Backend/internal/models"
	"PGTimeMachine-Backend/internal/services"

	"github.com/gin-gonic/gin"
)

type SnapshotController struct {
	snapshotService *services.SnapshotService
}

func NewSnapshotController(snapshotService *services.SnapshotService) *SnapshotController {
	return &SnapshotController{
		snapshotService: snapshotService,
	}
}

// CreateSnapshot creates a new database snapshot
func (sc *SnapshotController) CreateSnapshot(c *gin.Context) {
	var request struct {
		DatabaseConfig  models.DatabaseConnection `json:"database_config" binding:"required"`
		SnapshotRequest models.SnapshotRequest    `json:"snapshot_request" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request body",
			Error:   err.Error(),
		})
		return
	}

	snapshot, err := sc.snapshotService.CreateSnapshot(&request.DatabaseConfig, &request.SnapshotRequest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to create snapshot",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Snapshot creation started",
		Data:    snapshot,
	})
}

// RestoreSnapshot restores a database from a snapshot
func (sc *SnapshotController) RestoreSnapshot(c *gin.Context) {
	var request struct {
		DatabaseConfig models.DatabaseConnection `json:"database_config" binding:"required"`
		RestoreRequest models.RestoreRequest     `json:"restore_request" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request body",
			Error:   err.Error(),
		})
		return
	}

	operation, err := sc.snapshotService.RestoreSnapshot(&request.DatabaseConfig, &request.RestoreRequest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to start restore operation",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Restore operation started",
		Data:    operation,
	})
}

// ListSnapshots lists all snapshots for a database
func (sc *SnapshotController) ListSnapshots(c *gin.Context) {
	databaseID := c.Query("database_id")
	if databaseID == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "database_id query parameter is required",
		})
		return
	}

	snapshots, err := sc.snapshotService.ListSnapshots(databaseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to list snapshots",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Snapshots retrieved successfully",
		Data:    snapshots,
	})
}

// GetSnapshot retrieves a specific snapshot
func (sc *SnapshotController) GetSnapshot(c *gin.Context) {
	snapshotID := c.Param("id")
	if snapshotID == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "snapshot ID is required",
		})
		return
	}

	snapshot, err := sc.snapshotService.GetSnapshot(snapshotID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Snapshot not found",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Snapshot retrieved successfully",
		Data:    snapshot,
	})
}

// DeleteSnapshot deletes a snapshot
func (sc *SnapshotController) DeleteSnapshot(c *gin.Context) {
	snapshotID := c.Param("id")
	if snapshotID == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "snapshot ID is required",
		})
		return
	}

	err := sc.snapshotService.DeleteSnapshot(snapshotID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to delete snapshot",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Snapshot deleted successfully",
	})
}

// GetSnapshotProgress gets the progress of a snapshot operation
func (sc *SnapshotController) GetSnapshotProgress(c *gin.Context) {
	snapshotID := c.Param("id")
	if snapshotID == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "snapshot ID is required",
		})
		return
	}

	progress, err := sc.snapshotService.GetSnapshotProgress(snapshotID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get snapshot progress",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Snapshot progress retrieved successfully",
		Data:    progress,
	})
}
