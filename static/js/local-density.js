export function computeLocalDensity(focusedNodeId, edges, nodes, threshold) {
  if (threshold === undefined) threshold = 0.2;

  var uniqueEdges = dedupEdges(edges);
  var adj = {};
  var degree = {};
  Object.keys(nodes).forEach(function(id) {
    adj[id] = [];
    degree[id] = 0;
  });
  uniqueEdges.forEach(function(e) {
    if (!adj[e.node1] || !adj[e.node2]) return;
    adj[e.node1].push(e.node2);
    adj[e.node2].push(e.node1);
    degree[e.node1]++;
    degree[e.node2]++;
  });

  var neighborIds = adj[focusedNodeId] || [];
  var localGroup = [];
  var contextHubs = [];
  var scores = {};

  neighborIds.forEach(function(nid) {
    var shared = countCommon(adj, focusedNodeId, nid);
    var minDeg = Math.min(degree[focusedNodeId], degree[nid]);
    var score = minDeg > 0 ? shared / minDeg : 0;
    scores[nid] = score;
    var node = nodes[nid];
    if (!node) return;
    if (score >= threshold) {
      localGroup.push(node);
    } else {
      contextHubs.push(node);
    }
  });

  localGroup.sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });
  contextHubs.sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });

  return { localGroup: localGroup, contextHubs: contextHubs, scores: scores };
}

export function computeInclusionRelationships(localGroupNodes, edges, nodes, threshold) {
  if (threshold === undefined) threshold = 0.35;

  var uniqueEdges = dedupEdges(edges);
  var adj = {};
  var degree = {};
  Object.keys(nodes).forEach(function(id) {
    adj[id] = [];
    degree[id] = 0;
  });
  uniqueEdges.forEach(function(e) {
    if (!adj[e.node1] || !adj[e.node2]) return;
    adj[e.node1].push(e.node2);
    adj[e.node2].push(e.node1);
    degree[e.node1]++;
    degree[e.node2]++;
  });

  var localIds = localGroupNodes.map(function(n) { return n.id; });
  var childIds = new Set();
  var parentIds = new Set();
  var pairs = [];

  for (var i = 0; i < localIds.length; i++) {
    for (var j = i + 1; j < localIds.length; j++) {
      var idA = localIds[i];
      var idB = localIds[j];
      var degA = degree[idA] || 0;
      var degB = degree[idB] || 0;
      if (degA < 1 || degB < 1) continue;

      var shared = countCommon(adj, idA, idB);
      var incAtoB = degA > 0 ? shared / degA : 0;
      var incBtoA = degB > 0 ? shared / degB : 0;
      var asymmetry = incAtoB - incBtoA;

      if (Math.abs(asymmetry) >= threshold) {
        var childId, parentId, childName, parentName, childDegree, parentDegree;
        if (asymmetry > 0) {
          childId = idA; parentId = idB;
          childName = nodes[idA]?.name || idA;
          parentName = nodes[idB]?.name || idB;
          childDegree = degA; parentDegree = degB;
        } else {
          childId = idB; parentId = idA;
          childName = nodes[idB]?.name || idB;
          parentName = nodes[idA]?.name || idA;
          childDegree = degB; parentDegree = degA;
        }
        if (!childIds.has(childId)) childIds.add(childId);
        if (!parentIds.has(parentId)) parentIds.add(parentId);
        pairs.push({
          childId: childId,
          childName: childName,
          childDegree: childDegree,
          parentId: parentId,
          parentName: parentName,
          parentDegree: parentDegree,
          asymmetry: Math.abs(asymmetry),
          inclusionChildToParent: Math.max(incAtoB, incBtoA),
          inclusionParentToChild: Math.min(incAtoB, incBtoA)
        });
      }
    }
  }

  var children = localGroupNodes.filter(function(n) { return childIds.has(n.id); });
  var parents = localGroupNodes.filter(function(n) { return parentIds.has(n.id); });
  var neither = localGroupNodes.filter(function(n) { return !childIds.has(n.id) && !parentIds.has(n.id); });

  children.sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });
  parents.sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });
  neither.sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });

  return { children: children, parents: parents, neither: neither, pairs: pairs };
}

function dedupEdges(edges) {
  var seen = new Set();
  var result = [];
  edges.forEach(function(e) {
    if (!e || !e.node1 || !e.node2) return;
    var key = e.node1 < e.node2 ? e.node1 + '|' + e.node2 : e.node2 + '|' + e.node1;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(e);
  });
  return result;
}

function countCommon(adj, a, b) {
  var setA = new Set(adj[a] || []);
  var count = 0;
  (adj[b] || []).forEach(function(v) {
    if (setA.has(v)) count++;
  });
  return count;
}
