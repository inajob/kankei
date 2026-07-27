package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbDir := os.Getenv("DB_DIR")
	if dbDir == "" {
		home, _ := os.UserHomeDir()
		dbDir = filepath.Join(home, "kankei")
	}
	os.MkdirAll(dbDir, 0755)
	dbPath := filepath.Join(dbDir, "kankei.db")

	store, err := NewStore(dbPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer store.Close()

	nodeCount := 0
	nodes, _ := store.GetAllNodes()
	if nodes != nil {
		nodeCount = len(nodes)
	}
	if nodeCount == 0 {
		log.Println("seeding sample data...")
		seedSampleData(store)
	}

	api := NewAPI(store)

	mux := http.NewServeMux()

	mux.HandleFunc("/api/nodes", api.HandleNodes)
	mux.HandleFunc("/api/nodes/", api.HandleNodeByID)
	mux.HandleFunc("/api/edges", api.HandleEdges)
	mux.HandleFunc("/api/edges/remove", api.HandleEdgeRemove)
	mux.HandleFunc("/api/edges/", api.HandleEdgeByID)
	mux.HandleFunc("/api/export", api.HandleExport)
	mux.HandleFunc("/api/import", api.HandleImport)
	mux.HandleFunc("/api/reset", api.HandleReset)

	staticDir := filepath.Join(".", "static")
	mux.Handle("/", http.FileServer(http.Dir(staticDir)))

	log.Printf("ConceptNet server starting on http://0.0.0.0:%s\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
