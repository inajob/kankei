var assert = require('assert');

async function main() {
    var mod = await import('../static/js/clique.js');
    var findCliques = mod.findCliques;

    var passed = 0;
    var failed = 0;

    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    function setsEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        return arr1.every(function(s) {
            return arr2.some(function(t) { return arraysEqual(s, t); });
        });
    }

    function test(name, edges, nodeIds, expected, minSize) {
        var result = findCliques(edges || [], nodeIds || [], minSize);
        var ok = setsEqual(result, expected);
        if (ok) {
            passed++;
            console.log('  ✓ ' + name);
        } else {
            failed++;
            console.log('  ✗ ' + name);
            console.log('    expected:', JSON.stringify(expected));
            console.log('    actual:  ', JSON.stringify(result));
        }
    }

    console.log('\nBron–Kerbosch クリーク検出テスト\n');

    // 1. Empty graph
    test('空グラフ: クリークなし', [], ['A', 'B', 'C'], []);

    // 2. Single edge
    test('単一エッジ: サイズ不足', [
        { node1: 'A', node2: 'B' }
    ], ['A', 'B'], []);

    // 3. Triangle (K3)
    test('三角形 (K3)', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'C', node2: 'A' }
    ], ['A', 'B', 'C'], [['A', 'B', 'C']]);

    // 4. Triangle + dangling node
    test('三角形 + ぶら下りノード', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'C', node2: 'A' },
        { node1: 'D', node2: 'A' }
    ], ['A', 'B', 'C', 'D'], [['A', 'B', 'C']]);

    // 5. Two separate triangles
    test('2つの独立した三角形', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'C', node2: 'A' },
        { node1: 'X', node2: 'Y' },
        { node1: 'Y', node2: 'Z' },
        { node1: 'Z', node2: 'X' }
    ], ['A', 'B', 'C', 'X', 'Y', 'Z'], [['A', 'B', 'C'], ['X', 'Y', 'Z']]);

    // 6. K4 (4-clique)
    test('完全4頂点グラフ (K4)', [
        { node1: 'A', node2: 'B' },
        { node1: 'A', node2: 'C' },
        { node1: 'A', node2: 'D' },
        { node1: 'B', node2: 'C' },
        { node1: 'B', node2: 'D' },
        { node1: 'C', node2: 'D' }
    ], ['A', 'B', 'C', 'D'], [['A', 'B', 'C', 'D']]);

    // 7. Diamond (two triangles sharing one edge: A-B-C + B-C-D)
    test('ダイヤモンド (2つの三角形が辺を共有)', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'C', node2: 'A' },
        { node1: 'B', node2: 'D' },
        { node1: 'C', node2: 'D' }
    ], ['A', 'B', 'C', 'D'], [['A', 'B', 'C'], ['B', 'C', 'D']]);

    // 8. Tree (no cliques)
    test('ツリー構造: クリークなし', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'B', node2: 'D' }
    ], ['A', 'B', 'C', 'D'], []);

    // 9. Triangle with minSize=2 (Maximal=True: [A,B] is contained in [A,B,C])
    test('minSize=2 の三角形', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'C', node2: 'A' }
    ], ['A', 'B', 'C'], [['A', 'B', 'C']], 2);

    // 10. Isolated nodes (no edges)
    test('孤立ノードのみ', [], ['A', 'B', 'C'], []);

    // 11. Edges involving nodes not in nodeIds (should be ignored)
    test('指定ノード以外のエッジは無視', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'C', node2: 'A' },
        { node1: 'X', node2: 'Y' }
    ], ['A', 'B', 'C'], [['A', 'B', 'C']]);

    // 12. 5-cycle (no triangles)
    test('5-cycle (三角形なし)', [
        { node1: 'A', node2: 'B' },
        { node1: 'B', node2: 'C' },
        { node1: 'C', node2: 'D' },
        { node1: 'D', node2: 'E' },
        { node1: 'E', node2: 'A' }
    ], ['A', 'B', 'C', 'D', 'E'], []);

    // 13. K5 (5-clique)
    (function() {
        var edges = [];
        var nodes = ['A', 'B', 'C', 'D', 'E'];
        for (var i = 0; i < nodes.length; i++) {
            for (var j = i + 1; j < nodes.length; j++) {
                edges.push({ node1: nodes[i], node2: nodes[j] });
            }
        }
        test('完全5頂点グラフ (K5)', edges, nodes, [['A', 'B', 'C', 'D', 'E']]);
    })();

    // 14. Bow tie (2 triangles sharing 1 vertex)
    test('蝶ネクタイ (1頂点を共有する2つの三角形)', [
        { node1: 'A', node2: 'B' },
        { node1: 'A', node2: 'C' },
        { node1: 'B', node2: 'C' },
        { node1: 'B', node2: 'D' },
        { node1: 'B', node2: 'E' },
        { node1: 'D', node2: 'E' }
    ], ['A', 'B', 'C', 'D', 'E'], [['A', 'B', 'C'], ['B', 'D', 'E']]);

    var total = passed + failed;
    console.log('\n---');
    console.log('結果: ' + total + ' テスト中 ' + passed + ' 成功, ' + failed + ' 失敗');
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(function(err) {
    console.error('テスト実行エラー:', err);
    process.exit(1);
});
