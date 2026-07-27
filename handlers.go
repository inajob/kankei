package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
)

func generateID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 11)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return "id_" + string(b)
}

type API struct {
	store *Store
}

func NewAPI(store *Store) *API {
	return &API{store: store}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (a *API) HandleNodes(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.listNodes(w, r)
	case http.MethodPost:
		a.createNode(w, r)
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func (a *API) HandleNodeByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/nodes/")
	id = strings.TrimSuffix(id, "/edges")
	if id == "" {
		writeErr(w, 400, "missing node id")
		return
	}

	if strings.HasSuffix(r.URL.Path, "/edges") {
		a.getEdgesForNode(w, r, id)
		return
	}

	switch r.Method {
	case http.MethodDelete:
		a.deleteNode(w, r, id)
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func (a *API) listNodes(w http.ResponseWriter, _ *http.Request) {
	nodes, err := a.store.GetAllNodes()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if nodes == nil {
		nodes = make(map[string]Node)
	}
	writeJSON(w, 200, nodes)
}

func (a *API) createNode(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Name) == "" {
		writeErr(w, 400, "name is required")
		return
	}
	name := strings.TrimSpace(body.Name)

	existing, err := a.store.GetNodeByName(name)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if existing != nil {
		writeJSON(w, 200, existing)
		return
	}

	node, err := a.store.CreateNode(generateID(), name)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, node)
}

func (a *API) deleteNode(w http.ResponseWriter, _ *http.Request, id string) {
	if err := a.store.DeleteNode(id); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"ok": "deleted"})
}

func (a *API) getEdgesForNode(w http.ResponseWriter, _ *http.Request, nodeID string) {
	edges, err := a.store.GetEdgesForNode(nodeID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if edges == nil {
		edges = []Edge{}
	}
	writeJSON(w, 200, edges)
}

func (a *API) HandleEdges(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		a.createEdge(w, r)
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func (a *API) createEdge(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Node1 string `json:"node1"`
		Node2 string `json:"node2"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Node1 == "" || body.Node2 == "" {
		writeErr(w, 400, "node1 and node2 are required")
		return
	}
	if body.Node1 == body.Node2 {
		writeErr(w, 400, "self-loop not allowed")
		return
	}

	n1, err := a.store.GetNodeByID(body.Node1)
	if err != nil || n1 == nil {
		writeErr(w, 404, "node1 not found")
		return
	}
	n2, err := a.store.GetNodeByID(body.Node2)
	if err != nil || n2 == nil {
		writeErr(w, 404, "node2 not found")
		return
	}

	edge, err := a.store.CreateEdge(generateID(), body.Node1, body.Node2)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if edge == nil {
		writeJSON(w, 200, map[string]string{"info": "already connected"})
		return
	}
	writeJSON(w, 201, edge)
}

func (a *API) HandleEdgeByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeErr(w, 405, "method not allowed")
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/edges/")
	if err := a.store.DeleteEdge(id); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"ok": "deleted"})
}

func (a *API) HandleEdgeRemove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, 405, "method not allowed")
		return
	}
	var body struct {
		Node1 string `json:"node1"`
		Node2 string `json:"node2"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Node1 == "" || body.Node2 == "" {
		writeErr(w, 400, "node1 and node2 are required")
		return
	}
	if err := a.store.DeleteEdgeByNodes(body.Node1, body.Node2); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"ok": "removed"})
}

func (a *API) HandleExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, 405, "method not allowed")
		return
	}
	nodes, err := a.store.GetAllNodes()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	edges, err := a.store.GetAllEdges()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if nodes == nil {
		nodes = make(map[string]Node)
	}
	if edges == nil {
		edges = []Edge{}
	}
	writeJSON(w, 200, ExportData{Nodes: nodes, Edges: edges})
}

func (a *API) HandleImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, 405, "method not allowed")
		return
	}
	var data ExportData
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeErr(w, 400, "invalid JSON")
		return
	}
	if data.Nodes == nil {
		data.Nodes = make(map[string]Node)
	}
	if err := a.store.ImportData(data); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"ok": "imported"})
}

func (a *API) HandleReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, 405, "method not allowed")
		return
	}
	if err := a.store.ResetAll(); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	seedSampleData(a.store)
	writeJSON(w, 200, map[string]string{"ok": "reset"})
}

func seedSampleData(store *Store) {
	prefectures := []string{
		"北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
		"茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
		"新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
		"静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
		"奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
		"徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
		"熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
	}

	ids := make(map[string]string)

	japanNode, err := store.CreateNode(generateID(), "日本")
	if err == nil && japanNode != nil {
		ids["日本"] = japanNode.ID
	}

	for _, name := range prefectures {
		node, err := store.CreateNode(generateID(), name)
		if err != nil {
			log.Printf("seed node %q: %v", name, err)
			continue
		}
		ids[name] = node.ID
	}

	for _, name := range prefectures {
		if japanID, ok1 := ids["日本"]; ok1 {
			if prefID, ok2 := ids[name]; ok2 {
				if _, err := store.CreateEdge(generateID(), japanID, prefID); err != nil {
					fmt.Printf("seed edge 日本-%s: %v\n", name, err)
				}
			}
		}
	}
}
