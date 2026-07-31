var assert = require('assert');

async function main() {
    var mod = await import('../static/js/local-density.js');
    var computeLocalDensity = mod.computeLocalDensity;
    var computeInclusionRelationships = mod.computeInclusionRelationships;

    var passed = 0;
    var failed = 0;

    function arraysMatch(a, b) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (a[i].id !== b[i].id || a[i].name !== b[i].name) return false;
        }
        return true;
    }

    function scoresMatch(a, b) {
        var aKeys = Object.keys(a).sort();
        var bKeys = Object.keys(b).sort();
        if (aKeys.length !== bKeys.length) return false;
        for (var i = 0; i < aKeys.length; i++) {
            if (aKeys[i] !== bKeys[i]) return false;
            if (Math.abs(a[aKeys[i]] - b[bKeys[i]]) > 1e-10) return false;
        }
        return true;
    }

    function test(name, focusedNodeId, edges, nodeMap, threshold, expected) {
        var result = computeLocalDensity(focusedNodeId, edges, nodeMap, threshold);
        var localOk = arraysMatch(result.localGroup, expected.localGroup);
        var hubOk = arraysMatch(result.contextHubs, expected.contextHubs);
        var scoresOk = scoresMatch(result.scores, expected.scores);
        if (localOk && hubOk && scoresOk) {
            passed++;
            console.log('  \u2713 ' + name);
        } else {
            failed++;
            console.log('  \u2717 ' + name);
            if (!localOk) console.log('    localGroup:', JSON.stringify(result.localGroup));
            if (!hubOk) console.log('    contextHubs:', JSON.stringify(result.contextHubs));
            if (!scoresOk) console.log('    scores:', JSON.stringify(result.scores));
        }
    }

    function testInclusion(name, localGroupNodes, edges, nodeMap, threshold, expected) {
        var result = computeInclusionRelationships(localGroupNodes, edges, nodeMap, threshold);
        var childrenOk = arraysMatch(result.children, expected.children);
        var parentsOk = arraysMatch(result.parents, expected.parents);
        var neitherOk = arraysMatch(result.neither, expected.neither);
        var pairsLenOk = result.pairs.length === (expected.pairs || []).length;
        if (childrenOk && parentsOk && neitherOk && pairsLenOk) {
            passed++;
            console.log('  \u2713 ' + name);
        } else {
            failed++;
            console.log('  \u2717 ' + name);
            if (!childrenOk) console.log('    children:', JSON.stringify(result.children));
            if (!parentsOk) console.log('    parents:', JSON.stringify(result.parents));
            if (!neitherOk) console.log('    neither:', JSON.stringify(result.neither));
            if (!pairsLenOk) console.log('    pairs:', result.pairs.length);
        }
    }

    function n(id, name) { return { id: id, name: name }; }
    function nodes(map) { return map; }

    console.log('\nComputeLocalDensity \u30C6\u30B9\u30C8\n');

    test('\u7A7A\u30B0\u30E9\u30D5', 'A', [], {}, undefined, { localGroup: [], contextHubs: [], scores: {} });
    test('\u30CE\u30FC\u30C9\u3042\u308A\u30A8\u30C3\u30B8\u306A\u3057', 'A', [], nodes({ A: n('A', 'Alpha') }), undefined, { localGroup: [], contextHubs: [], scores: {} });
    test('\u30B9\u30BF\u30FC A-B', 'A', [{ node1: 'A', node2: 'B' }], nodes({ A: n('A', 'Alpha'), B: n('B', 'Beta') }), undefined, { localGroup: [], contextHubs: [n('B', 'Beta')], scores: { B: 0 } });
    test('\u4E09\u89D2\u5F62 K3', 'A', [{ node1: 'A', node2: 'B' }, { node1: 'B', node2: 'C' }, { node1: 'C', node2: 'A' }], nodes({ A: n('A', 'Alpha'), B: n('B', 'Beta'), C: n('C', 'Gamma') }), undefined, { localGroup: [n('B', 'Beta'), n('C', 'Gamma')], contextHubs: [], scores: { B: 0.5, C: 0.5 } });
    test('\u30B9\u30BF\u30FC', 'A', [{ node1: 'A', node2: 'B' }, { node1: 'A', node2: 'C' }, { node1: 'A', node2: 'D' }], nodes({ A: n('A', 'Alpha'), B: n('B', 'Beta'), C: n('C', 'Gamma'), D: n('D', 'Delta') }), undefined, { localGroup: [], contextHubs: [n('B', 'Beta'), n('D', 'Delta'), n('C', 'Gamma')], scores: { B: 0, C: 0, D: 0 } });
    test('\u6DF7\u5408', 'A', [{ node1: 'A', node2: 'B' }, { node1: 'A', node2: 'C' }, { node1: 'B', node2: 'C' }, { node1: 'A', node2: 'D' }], nodes({ A: n('A', 'Alpha'), B: n('B', 'Beta'), C: n('C', 'Gamma'), D: n('D', 'Delta') }), undefined, { localGroup: [n('B', 'Beta'), n('C', 'Gamma')], contextHubs: [n('D', 'Delta')], scores: { B: 0.5, C: 0.5, D: 0 } });
    test('K4', 'A', [{ node1: 'A', node2: 'B' }, { node1: 'A', node2: 'C' }, { node1: 'A', node2: 'D' }, { node1: 'B', node2: 'C' }, { node1: 'B', node2: 'D' }, { node1: 'C', node2: 'D' }], nodes({ A: n('A', 'A'), B: n('B', 'B'), C: n('C', 'C'), D: n('D', 'D') }), undefined, { localGroup: [n('B', 'B'), n('C', 'C'), n('D', 'D')], contextHubs: [], scores: { B: 2/3, C: 2/3, D: 2/3 } });
    test('\u6B21\u65700', 'A', [], nodes({ A: n('A', 'Alpha'), B: n('B', 'Beta') }), undefined, { localGroup: [], contextHubs: [], scores: {} });
    test('\u30CE\u30FC\u30C9\u8F9E\u66F8\u306A\u3057', 'A', [{ node1: 'A', node2: 'X' }], nodes({ A: n('A', 'Alpha') }), undefined, { localGroup: [], contextHubs: [], scores: {} });
    test('\u7121\u95A2\u9023', 'X', [{ node1: 'A', node2: 'B' }, { node1: 'B', node2: 'C' }], nodes({ A: n('A', 'A'), B: n('B', 'B'), C: n('C', 'C'), X: n('X', 'X') }), undefined, { localGroup: [], contextHubs: [], scores: {} });
    test('\u91CD\u8907\u30A8\u30C3\u30B8: \u540C\u3058\u7D50\u679C\u3067\u30C1\u30C3\u30D7\u91CD\u8907\u3057\u306A\u3044', 'A', [{ node1: 'A', node2: 'B' }, { node1: 'A', node2: 'B' }, { node1: 'B', node2: 'C' }, { node1: 'B', node2: 'C' }, { node1: 'C', node2: 'A' }, { node1: 'C', node2: 'A' }], nodes({ A: n('A', 'Alpha'), B: n('B', 'Beta'), C: n('C', 'Gamma') }), undefined, { localGroup: [n('B', 'Beta'), n('C', 'Gamma')], contextHubs: [], scores: { B: 0.5, C: 0.5 } });

    console.log('\n\nComputeInclusionRelationships \u30C6\u30B9\u30C8\n');

    // Test 1: Simple parent-child (specific has fewer connections)
    testInclusion('A\u2282B: A\u306F\u5177\u4F53\u7684\u3001B\u306F\u4E00\u822C\u7684',
        [n('A', 'A'), n('B', 'B')],
        [{ node1: 'A', node2: 'F' }, { node1: 'B', node2: 'F' }, { node1: 'B', node2: 'G' }],
        nodes({ A: n('A', 'A'), B: n('B', 'B'), F: n('F', 'F'), G: n('G', 'G') }),
        0.3,
        { children: [n('A', 'A')], parents: [n('B', 'B')], neither: [], pairs: [['A', 'B']] });

    // Test 2: No inclusion (all have same number of connections)
    testInclusion('\u540C\u30EC\u30D9\u30EB: \u5305\u6471\u306A\u3057',
        [n('A', 'A'), n('B', 'B'), n('C', 'C')],
        [{ node1: 'A', node2: 'F' }, { node1: 'B', node2: 'F' }, { node1: 'C', node2: 'F' }],
        nodes({ A: n('A', 'A'), B: n('B', 'B'), C: n('C', 'C'), F: n('F', 'F') }),
        0.5,
        { children: [], parents: [], neither: [n('A', 'A'), n('B', 'B'), n('C', 'C')], pairs: [] });

    // Test 3: Diamond pattern (one parent, two children)
    testInclusion('\u30C0\u30A4\u30E4\u30E2\u30F3\u30C9: \u4E00\u3064\u306E\u89AA\u306B\u5B50\u304C\u4E8C\u3064',
        [n('A', 'A'), n('B', 'B'), n('C', 'C')],
        [{ node1: 'A', node2: 'F' }, { node1: 'B', node2: 'F' }, { node1: 'C', node2: 'F' }, { node1: 'C', node2: 'G' }],
        nodes({ A: n('A', 'A'), B: n('B', 'B'), C: n('C', 'C'), F: n('F', 'F'), G: n('G', 'G') }),
        0.3,
        { children: [n('A', 'A'), n('B', 'B')], parents: [n('C', 'C')], neither: [], pairs: [['A', 'C'], ['B', 'C']] });

    // Test 4: All same level with unique connections (no meaningful inclusion)
    testInclusion('\u3059\u3079\u3066\u540C\u30EC\u30D9\u30EB: \u305D\u308C\u305E\u308C\u7368\u81EA\u306E\u63A5\u7D9A',
        [n('A', 'A'), n('B', 'B'), n('C', 'C')],
        [
            { node1: 'A', node2: 'F' }, { node1: 'A', node2: 'G' },
            { node1: 'B', node2: 'F' }, { node1: 'B', node2: 'H' },
            { node1: 'C', node2: 'F' }, { node1: 'C', node2: 'I' },
        ],
        nodes({ A: n('A', 'A'), B: n('B', 'B'), C: n('C', 'C'), F: n('F', 'F'), G: n('G', 'G'), H: n('H', 'H'), I: n('I', 'I') }),
        0.5,
        { children: [], parents: [], neither: [n('A', 'A'), n('B', 'B'), n('C', 'C')], pairs: [] });

    // Test 5: Linear chain: D ⊂ B ⊂ A (D restrictive, A general)
    testInclusion('\u9023\u9396: D\u2282B\u2282A',
        [n('A', 'A'), n('B', 'B'), n('D', 'D')],
        [
            { node1: 'D', node2: 'F' },
            { node1: 'B', node2: 'F' }, { node1: 'B', node2: 'G' },
            { node1: 'A', node2: 'F' }, { node1: 'A', node2: 'G' }, { node1: 'A', node2: 'H' },
        ],
        nodes({ A: n('A', 'A'), B: n('B', 'B'), D: n('D', 'D'), F: n('F', 'F'), G: n('G', 'G'), H: n('H', 'H') }),
        0.3,
        { children: [n('B', 'B'), n('D', 'D')], parents: [n('A', 'A'), n('B', 'B')], neither: [], pairs: [['D', 'A'], ['D', 'B'], ['B', 'A']] });

    // Test 6: Japanese concept labels (ASCII sorted before Japanese ja locale)
    testInclusion('\u65E5\u672C\u8A9E\u30CE\u30FC\u30C9\u3067\u5305\u6471\u95A2\u4FC2',
        [n('B', '\u63A8\u7406\u6F2B\u753B'), n('C', '\u6F2B\u753B')],
        [{ node1: 'B', node2: 'F' }, { node1: 'C', node2: 'F' }, { node1: 'C', node2: 'G' }],
        nodes({ B: n('B', '\u63A8\u7406\u6F2B\u753B'), C: n('C', '\u6F2B\u753B'), F: n('F', '\u672C'), G: n('G', '\u5C0F\u8AAC') }),
        0.3,
        { children: [n('B', '\u63A8\u7406\u6F2B\u753B')], parents: [n('C', '\u6F2B\u753B')], neither: [], pairs: [['B', 'C']] });

    // Test 7: Duplicate edges must not break inclusion detection (degree inflation would mask asymmetry)
    testInclusion('\u91CD\u8907\u30A8\u30C3\u30B8: \u5305\u6471\u95A2\u4FC2\u304C\u4E71\u308C\u306A\u3044',
        [n('A', 'A'), n('B', 'B')],
        [{ node1: 'A', node2: 'F' }, { node1: 'A', node2: 'F' }, { node1: 'B', node2: 'F' }, { node1: 'B', node2: 'G' }],
        nodes({ A: n('A', 'A'), B: n('B', 'B'), F: n('F', 'F'), G: n('G', 'G') }),
        0.3,
        { children: [n('A', 'A')], parents: [n('B', 'B')], neither: [], pairs: [['A', 'B']] });

    var total = passed + failed;
    console.log('\n---');
    console.log('\u7D50\u679C: ' + total + ' \u30C6\u30B9\u30C8\u4E2D ' + passed + ' \u6210\u529F, ' + failed + ' \u5931\u6557');
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(function(err) {
    console.error('\u30C6\u30B9\u30C8\u5B9F\u884C\u30A8\u30E9\u30FC:', err);
    process.exit(1);
});
