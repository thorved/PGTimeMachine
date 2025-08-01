# PostgreSQL Time Machine

A web application that allows you to create snapshots/backups of PostgreSQL databases and restore them with ease. Built with Go (Gin framework) for the backend and Next.js for the frontend.

## Features

- **Database Connection Management**: Connect to PostgreSQL databases with connection testing
- **Snapshot Creation**: Create full database backups using `pg_dump`
- **Snapshot Restoration**: Restore databases from snapshots using `psql`
- **Real-time Status**: Monitor backup and restore operations
- **User-friendly Interface**: Modern web interface with dark mode support

## Architecture

### Backend (Go + Gin)
- **Models**: Database structures and API models
- **Services**: Business logic for database operations and snapshot management
- **Controllers**: HTTP request handlers
- **Routes**: API endpoint definitions

### Frontend (Next.js + TypeScript)
- **Components**: Reusable UI components
- **Pages**: Main application pages
- **API Integration**: Communication with backend services

## Prerequisites

### System Requirements
- PostgreSQL client tools (`pg_dump`, `psql`) must be installed and accessible in PATH
- Go 1.21 or higher
- Node.js 18 or higher
- PostgreSQL database server(s) to backup/restore

### Installing PostgreSQL Client Tools

#### Windows
```bash
# Download and install PostgreSQL from https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql
```

#### macOS
```bash
# Using Homebrew
brew install postgresql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

## Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Go dependencies:
```bash
go mod tidy
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=8080
GIN_MODE=debug
BACKUP_DIR=./backups
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

5. Run the backend server:
```bash
go run main.go
```

The backend will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

## Usage

### 1. Database Connection
- Open the application in your browser
- Fill in your PostgreSQL database connection details:
  - Connection Name: A friendly name for your connection
  - Host: Database server hostname/IP
  - Port: Database port (default: 5432)
  - Database: Database name
  - Username: Database username
  - Password: Database password
  - SSL Mode: SSL connection mode
- Click "Test Connection" to verify the connection
- Once connected, switch to "Snapshot Management"

### 2. Creating Snapshots
- Click "Create Snapshot" button
- Enter a name and optional description
- The system will use `pg_dump` to create a complete backup
- Monitor the status in the snapshots list

### 3. Restoring Snapshots
- Find the snapshot you want to restore
- Click "Restore" button
- Optionally specify a target database name
- The system will create a new database and restore the data

## API Endpoints

### Database Operations
- `POST /api/v1/database/test` - Test database connection
- `POST /api/v1/database/save` - Save database connection
- `POST /api/v1/database/info` - Get database information

### Snapshot Operations
- `POST /api/v1/snapshots/create` - Create a new snapshot
- `POST /api/v1/snapshots/restore` - Restore from snapshot
- `GET /api/v1/snapshots/` - List snapshots
- `GET /api/v1/snapshots/:id` - Get specific snapshot
- `DELETE /api/v1/snapshots/:id` - Delete snapshot

## Project Structure

```
PGTimeMachine/
├── backend/
│   ├── main.go                 # Application entry point
│   ├── go.mod                  # Go module definition
│   ├── .env.example           # Environment variables template
│   ├── cmd/
│   │   └── server/
│   │       └── api.go         # Server setup and configuration
│   └── internal/
│       ├── controllers/       # HTTP request handlers
│       │   ├── database.go
│       │   └── snapshot.go
│       ├── models/           # Data structures
│       │   └── database.go
│       ├── routes/           # API route definitions
│       │   └── routes.go
│       └── services/         # Business logic
│           ├── database.go
│           └── snapshot.go
├── frontend/
│   ├── package.json          # Node.js dependencies
│   ├── next.config.ts        # Next.js configuration
│   ├── tailwind.config.ts    # Tailwind CSS configuration
│   └── src/
│       └── app/
│           ├── layout.tsx    # Root layout
│           ├── page.tsx      # Main page
│           ├── globals.css   # Global styles
│           └── components/   # React components
│               ├── DatabaseConnection.tsx
│               └── SnapshotManager.tsx
└── README.md
```

## Development

### Backend Development
- The backend uses Gin framework for HTTP routing
- CORS is configured to allow frontend connections
- Environment variables are loaded from `.env` file
- Backup files are stored in `./backups` directory by default

### Frontend Development
- Built with Next.js 15 and React 19
- Uses TypeScript for type safety
- Tailwind CSS for styling
- Client-side state management with React hooks

## Security Considerations

- Database passwords are transmitted over HTTP (use HTTPS in production)
- No authentication system implemented (add auth for production use)
- Backup files are stored locally on the server
- Consider encrypting backup files for sensitive data

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Database connection encryption (HTTPS)
- [ ] Scheduled automatic backups
- [ ] Backup file encryption
- [ ] Remote storage support (AWS S3, Google Cloud, etc.)
- [ ] Backup compression options
- [ ] Email notifications for backup status
- [ ] Multiple database support in single session
- [ ] Backup retention policies
- [ ] Incremental backups

## Troubleshooting

### Common Issues

1. **"pg_dump not found" error**
   - Ensure PostgreSQL client tools are installed
   - Add PostgreSQL bin directory to PATH

2. **Connection refused errors**
   - Check if PostgreSQL server is running
   - Verify host, port, and credentials
   - Check firewall settings

3. **Backend server not starting**
   - Ensure port 8080 is not in use
   - Check Go installation and dependencies

4. **Frontend not loading**
   - Ensure Node.js dependencies are installed
   - Check if port 3000 is available

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.