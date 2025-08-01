package routes

import (
	"PGTimeMachine-Backend/internal/controllers"

	"github.com/gin-gonic/gin"
)

func SetupDatabaseRoutes(router *gin.Engine, controller *controllers.DatabaseController) {
	api := router.Group("/api/v1")
	{
		database := api.Group("/database")
		{
			database.POST("/test", controller.TestConnection)
			database.POST("/save", controller.SaveConnection)
			database.POST("/info", controller.GetDatabaseInfo)
		}
	}
}

func SetupSnapshotRoutes(router *gin.Engine, controller *controllers.SnapshotController) {
	api := router.Group("/api/v1")
	{
		snapshots := api.Group("/snapshots")
		{
			snapshots.POST("/create", controller.CreateSnapshot)
			snapshots.POST("/restore", controller.RestoreSnapshot)
			snapshots.GET("/", controller.ListSnapshots)
			snapshots.GET("/:id", controller.GetSnapshot)
			snapshots.GET("/:id/progress", controller.GetSnapshotProgress)
			snapshots.DELETE("/:id", controller.DeleteSnapshot)
		}
	}
}

func SetupSystemRoutes(router *gin.Engine, controller *controllers.SystemController) {
	api := router.Group("/api/v1")
	{
		system := api.Group("/system")
		{
			system.GET("/health", controller.HealthCheck)
			system.GET("/info", controller.GetSystemInfo)
		}
	}
}
