var WIKI_API = 'https://ja.wikipedia.org/w/api.php';
var debounceTimer = null;
var lastQuery = '';
var lastCallback = null;

export function fetchWikiSuggestions(query, callback) {
    lastQuery = query;
    lastCallback = callback;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!query || query.length < 2) {
        callback([]);
        return;
    }
    debounceTimer = setTimeout(function() {
        doFetch(query, callback);
    }, 300);
}

function doFetch(query, callback) {
    var params = 'action=opensearch&search=' + encodeURIComponent(query) + '&limit=5&namespace=0&format=json&origin=*';
    fetch(WIKI_API + '?' + params)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (lastQuery !== query) return;
            var titles = data[1] || [];
            var descs = data[2] || [];
            var urls = data[3] || [];
            var results = [];
            for (var i = 0; i < titles.length; i++) {
                results.push({ title: titles[i], description: descs[i] || '', url: urls[i] || '' });
            }
            callback(results);
        })
        .catch(function() {
            if (lastQuery === query) callback([]);
        });
}
