package server

import (
	"PGTimeMachine-Backend/internal/controllers"
	"PGTimeMachine-Backend/internal/routes"
	"PGTimeMachine-Backend/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Server struct {
	router *gin.Engine
}

func NewServer() *Server {
	router := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000", "http://localhost:3001"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	router.Use(cors.New(config))

	// Initialize services
	dbService := services.NewDatabaseService()
	snapshotService := services.NewSnapshotService(dbService)

	// Initialize controllers
	dbController := controllers.NewDatabaseController(dbService)
	snapshotController := controllers.NewSnapshotController(snapshotService)
	systemController := controllers.NewSystemController()

	// Setup routes
	routes.SetupDatabaseRoutes(router, dbController)
	routes.SetupSnapshotRoutes(router, snapshotController)
	routes.SetupSystemRoutes(router, systemController)

	return &Server{
		router: router,
	}
}

func (s *Server) Run(addr string) error {
	return s.router.Run(addr)
}
