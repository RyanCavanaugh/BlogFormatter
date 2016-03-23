/// <reference path="jquery.d.ts" />

declare var Tautologistics: any;
interface ParsedElement {
    /// 'tag' or 'text'
    type: string;
    /// Tag name, e.g. 'p' for <p>
    name: string;
    /// Content for 'text' nodes
    data: string;
    /// Child elements
    children: ParsedElement[];

    attributes: {
        [attrName: string]: string;
    }[];
}

$(() => {

    var outputGithub = window.localStorage.getItem('outputGithub');
    $('#input').val(window.localStorage.getItem('inputText'));
    $('#outputGithub').val(outputGithub);
    $('#outputMsdn').val(makeReplacements(outputGithub));

    var timer: number = undefined;
    $('#input').bind('input propertychange', () => {
        console.log('changed');
        if (timer !== undefined) {
            window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
            console.log('timeout');
            timer = undefined;
            window.localStorage.setItem('inputText', $('#input').val());
            render();
        }, 400);
    });
});

function makeReplacements(input: string) {
    var builder = new Tautologistics.NodeHtmlParser.HtmlBuilder();
    var parser = new Tautologistics.NodeHtmlParser.Parser(builder);
    if (input) {
        parser.parseChunk(input);    
    }

    var data = <ParsedElement[]>builder.dom;

    function getAttribute(node: ParsedElement, attrName: string) {
        if (node.attributes && node.attributes.hasOwnProperty(attrName)) {
            return node.attributes[attrName];
        } else {
            return undefined;
        }
    }

    function fix(node: ParsedElement) {
        var classAttr = getAttribute(node, 'class');

        var codeFixes: any = {};
        // Keyword blue: 0603D8
        // Comment green: 006A0A
        // String red: 901319

        // A mapping of github code names to colors

        var colors: any = {};
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

    function render(node: ParsedElement) {
        fix(node);
        if (node.type === 'tag') {
            var result = '<' + node.name;
            if (node.attributes) {
                result = result + ' ' + Object.keys(node.attributes).map(attr => attr + '="' + node.attributes[attr] + '"').join(' ');
            }
            result = result + '>';
            if (node.children) {
                result = result + node.children.map(child => render(child)).join('');
            }

            return result + '</' + node.name + '>';
        } else if (node.type === 'text') {
            return node.data;
        } else {
            throw new Error('Unknown node type ' + node.type);
        }
    }

    // return JSON.stringify(data);
    return data.map(n => render(n)).join('');
}

function callback(data) {
    console.log('callback');
    console.log(data);
}

// Map div class='highlight' to nothing



function render() {
    $('#output').val((Math.random() * 100).toString());


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
        success: (data, status) => {
            $('#outputGithub').val(data);
            window.localStorage.setItem('outputGithub', data);
            $('#outputMsdn').val(makeReplacements(data));
        }
    });
}
