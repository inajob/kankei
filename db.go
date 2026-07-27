package main

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Node struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"createdAt"`
}

type Edge struct {
	ID    string `json:"id"`
	Node1 string `json:"node1"`
	Node2 string `json:"node2"`
}

type ExportData struct {
	Nodes map[string]Node `json:"nodes"`
	Edges []Edge          `json:"edges"`
}

type Store struct {
	db *sql.DB
}

func NewStore(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	s := &Store{db: db}
	if _, err := s.db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("set journal mode: %w", err)
	}
	if _, err := s.db.Exec("PRAGMA foreign_keys=ON"); err != nil {
		return nil, fmt.Errorf("enable foreign keys: %w", err)
	}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return s, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	for _, q := range []string{
		`CREATE TABLE IF NOT EXISTS nodes (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			created_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS edges (
			id TEXT PRIMARY KEY,
			node1 TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
			node2 TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
			UNIQUE(node1, node2)
		)`,
	} {
		if _, err := s.db.Exec(q); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) GetAllNodes() (map[string]Node, error) {
	rows, err := s.db.Query("SELECT id, name, created_at FROM nodes")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	nodes := make(map[string]Node)
	for rows.Next() {
		var n Node
		if err := rows.Scan(&n.ID, &n.Name, &n.CreatedAt); err != nil {
			return nil, err
		}
		nodes[n.ID] = n
	}
	return nodes, rows.Err()
}

func (s *Store) GetNodeByID(id string) (*Node, error) {
	var n Node
	err := s.db.QueryRow("SELECT id, name, created_at FROM nodes WHERE id = ?", id).Scan(&n.ID, &n.Name, &n.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (s *Store) GetNodeByName(name string) (*Node, error) {
	var n Node
	err := s.db.QueryRow("SELECT id, name, created_at FROM nodes WHERE name = ?", name).Scan(&n.ID, &n.Name, &n.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (s *Store) CreateNode(id, name string) (*Node, error) {
	now := time.Now().UnixMilli()
	_, err := s.db.Exec("INSERT OR IGNORE INTO nodes (id, name, created_at) VALUES (?, ?, ?)", id, name, now)
	if err != nil {
		return nil, err
	}
	return s.GetNodeByName(name)
}

func (s *Store) DeleteNode(id string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec("DELETE FROM edges WHERE node1 = ? OR node2 = ?", id, id); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM nodes WHERE id = ?", id); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) GetAllEdges() ([]Edge, error) {
	rows, err := s.db.Query("SELECT id, node1, node2 FROM edges")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var edges []Edge
	for rows.Next() {
		var e Edge
		if err := rows.Scan(&e.ID, &e.Node1, &e.Node2); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	return edges, rows.Err()
}

func (s *Store) GetEdgesForNode(nodeID string) ([]Edge, error) {
	rows, err := s.db.Query("SELECT id, node1, node2 FROM edges WHERE node1 = ? OR node2 = ?", nodeID, nodeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var edges []Edge
	for rows.Next() {
		var e Edge
		if err := rows.Scan(&e.ID, &e.Node1, &e.Node2); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	return edges, rows.Err()
}

func (s *Store) CreateEdge(id, node1, node2 string) (*Edge, error) {
	if node1 == node2 {
		return nil, fmt.Errorf("self-loop not allowed")
	}
	_, err := s.db.Exec("INSERT OR IGNORE INTO edges (id, node1, node2) VALUES (?, ?, ?)", id, node1, node2)
	if err != nil {
		return nil, err
	}
	var e Edge
	err = s.db.QueryRow(
		"SELECT id, node1, node2 FROM edges WHERE (node1 = ? AND node2 = ?) OR (node1 = ? AND node2 = ?)",
		node1, node2, node2, node1,
	).Scan(&e.ID, &e.Node1, &e.Node2)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &e, err
}

func (s *Store) DeleteEdge(id string) error {
	_, err := s.db.Exec("DELETE FROM edges WHERE id = ?", id)
	return err
}

func (s *Store) DeleteEdgeByNodes(node1, node2 string) error {
	_, err := s.db.Exec("DELETE FROM edges WHERE (node1 = ? AND node2 = ?) OR (node1 = ? AND node2 = ?)", node1, node2, node2, node1)
	return err
}

func (s *Store) ResetAll() error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec("DELETE FROM edges"); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM nodes"); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) ImportData(data ExportData) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec("DELETE FROM edges"); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM nodes"); err != nil {
		return err
	}
	for _, n := range data.Nodes {
		if _, err := tx.Exec("INSERT OR IGNORE INTO nodes (id, name, created_at) VALUES (?, ?, ?)", n.ID, n.Name, n.CreatedAt); err != nil {
			return err
		}
	}
	for _, e := range data.Edges {
		if _, err := tx.Exec("INSERT OR IGNORE INTO edges (id, node1, node2) VALUES (?, ?, ?)", e.ID, e.Node1, e.Node2); err != nil {
			return err
		}
	}
	return tx.Commit()
}
