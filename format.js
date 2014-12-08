/// <reference path="jquery.d.ts" />

$(function () {
    var outputGithub = window.localStorage.getItem('outputGithub') || '';
    $('#input').val(window.localStorage.getItem('inputText') || '');
    $('#outputGithub').val(outputGithub);
    $('#outputMsdn').val(makeReplacements(outputGithub));

    var timer = undefined;
    $('#input').bind('input propertychange', function () {
        if (timer !== undefined) {
            window.clearTimeout(timer);
        }
        timer = window.setTimeout(function () {
            timer = undefined;
            window.localStorage.setItem('inputText', $('#input').val());
            render();
        }, 400);
    });
});

function makeReplacements(input) {
    var builder = new Tautologistics.NodeHtmlParser.HtmlBuilder();
    var parser = new Tautologistics.NodeHtmlParser.Parser(builder);
    parser.parseChunk(input);

    var data = builder.dom;

    function getAttribute(node, attrName) {
        if (node.attributes && node.attributes.hasOwnProperty(attrName)) {
            return node.attributes[attrName];
        } else {
            return undefined;
        }
    }

    function fix(node) {
        var classAttr = getAttribute(node, 'class');

        var codeFixes = {};

        // Keyword blue: 0603D8
        // Comment green: 006A0A
        // String red: 901319
        // A mapping of github code names to colors
        var colors = {};
        colors['pl-st'] = colors['pl-k'] = '#0603D8'; // Keywords (blue)
        colors['pl-en'] = 'black'; // Identifiers (black)
        colors['pl-c'] = '#006A0A'; // Comments (green)
        colors['pl-pds'] = colors['pl-s1'] = '#901319'; // String literals (red)

        if (node.name === 'div' && classAttr.indexOf('highlight') >= 0) {
            node.name = 'span';
            delete node.attributes['class'];
            node.attributes['style'] = "font-family: 'courier new', courier;";
        } else {
            // General code colorization fixes
            if (node.name === 'span') {
                var colorFixes = Object.keys(colors);
                for (var i = 0; i < colorFixes.length; i++) {
                    if (node.attributes['class'] === colorFixes[i]) {
                        delete node.attributes['class'];
                        node.attributes['style'] = 'color: ' + colors[colorFixes[i]];
                    }
                }
            }
        }
    }

    function render(node) {
        fix(node);
        if (node.type === 'tag') {
            var result = '<' + node.name;
            if (node.attributes) {
                result = result + ' ' + Object.keys(node.attributes).map(function (attr) {
                    return attr + '="' + node.attributes[attr] + '"';
                }).join(' ');
            }
            result = result + '>';
            if (node.children) {
                result = result + node.children.map(function (child) {
                    return render(child);
                }).join('');
            }

            return result + '</' + node.name + '>';
        } else if (node.type === 'text') {
            return node.data;
        } else {
            throw new Error('Unknown node type ' + node.type);
        }
    }

    return data.map(function (n) {
        return render(n);
    }).join('');
}

function render() {
    $.ajax({
        url: 'https://api.github.com/markdown',
        jsonp: 'callback',
        contentType: 'application/json',
        data: JSON.stringify({
            text: $('#input').val(),
            mode: 'markdown',
            context: 'Microsoft/TypeScript'
        }),
        type: 'POST',
        success: function (data, status) {
            $('#outputGithub').val(data);
            window.localStorage.setItem('outputGithub', data);
            $('#outputMsdn').val(makeReplacements(data));
        }
    });
}
