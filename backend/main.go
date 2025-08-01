package main

import (
	"log"
	"os"

	"PGTimeMachine-Backend/cmd/server"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// Set Gin mode based on environment
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize and start the server
	srv := server.NewServer()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting PGTimeMachine server on port %s", port)
	if err := srv.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
