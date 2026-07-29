function buildAdjacencyList(edges, nodeIds) {
    var nodeSet = new Set(nodeIds);
    var adj = {};
    nodeIds.forEach(function(id) { adj[id] = []; });
    edges.forEach(function(e) {
        if (nodeSet.has(e.node1) && nodeSet.has(e.node2)) {
            adj[e.node1].push(e.node2);
            adj[e.node2].push(e.node1);
        }
    });
    return adj;
}

export function findCliques(edges, nodeIds, minSize) {
    if (minSize === undefined) minSize = 3;
    var adj = buildAdjacencyList(edges, nodeIds);
    var allNodes = Object.keys(adj);
    var cliques = [];

    function choosePivot(P, X) {
        var maxDeg = -1;
        var pivot = null;
        P.concat(X).forEach(function(v) {
            var deg = adj[v] ? adj[v].length : 0;
            if (deg > maxDeg) { maxDeg = deg; pivot = v; }
        });
        return pivot;
    }

    function bronKerbosch(R, P, X) {
        if (P.length === 0 && X.length === 0) {
            if (R.length >= minSize) {
                cliques.push(R.slice().sort());
            }
            return;
        }
        var pivot = choosePivot(P, X);
        var pivotNbrs = pivot ? new Set(adj[pivot] || []) : new Set();
        var candidates = P.filter(function(v) { return !pivotNbrs.has(v); });
        candidates.forEach(function(v) {
            var vNbrs = new Set(adj[v] || []);
            bronKerbosch(
                R.concat([v]),
                P.filter(function(u) { return vNbrs.has(u); }),
                X.filter(function(u) { return vNbrs.has(u); })
            );
            P.splice(P.indexOf(v), 1);
            X.push(v);
        });
    }

    bronKerbosch([], allNodes.slice(), []);
    return cliques;
}
