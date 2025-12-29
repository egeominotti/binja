/**
 * Parser Tests - Based on Jinja2 test_lexnparse.py and test_core_tags.py
 */
import { describe, test, expect } from 'bun:test'
import { Lexer } from '../src/lexer'
import { Parser } from '../src/parser'
import type { TemplateNode } from '../src/parser/nodes'

function parse(source: string): TemplateNode {
  const lexer = new Lexer(source)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens)
  return parser.parse()
}

describe('Parser', () => {
  describe('Basic Parsing', () => {
    test('parses empty template', () => {
      const ast = parse('')
      expect(ast.type).toBe('Template')
      expect(ast.body.length).toBe(0)
    })

    test('parses plain text', () => {
      const ast = parse('Hello World')
      expect(ast.body.length).toBe(1)
      expect(ast.body[0].type).toBe('Text')
    })

    test('parses variable output', () => {
      const ast = parse('{{ name }}')
      expect(ast.body.length).toBe(1)
      expect(ast.body[0].type).toBe('Output')
    })

    test('parses mixed content', () => {
      const ast = parse('Hello {{ name }}!')
      expect(ast.body.length).toBe(3)
      expect(ast.body[0].type).toBe('Text')
      expect(ast.body[1].type).toBe('Output')
      expect(ast.body[2].type).toBe('Text')
    })
  })

  describe('Expressions', () => {
    test('parses simple name', () => {
      const ast = parse('{{ name }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('Name')
      expect(output.expression.name).toBe('name')
    })

    test('parses string literal', () => {
      const ast = parse('{{ "hello" }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('Literal')
      expect(output.expression.value).toBe('hello')
    })

    test('parses number literal', () => {
      const ast = parse('{{ 42 }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('Literal')
      expect(output.expression.value).toBe(42)
    })

    test('parses float literal', () => {
      const ast = parse('{{ 3.14 }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('Literal')
      expect(output.expression.value).toBe(3.14)
    })

    test('parses boolean literals', () => {
      const astTrue = parse('{{ true }}')
      const outputTrue = astTrue.body[0] as any
      expect(outputTrue.expression.value).toBe(true)

      const astFalse = parse('{{ false }}')
      const outputFalse = astFalse.body[0] as any
      expect(outputFalse.expression.value).toBe(false)
    })

    test('parses null/none literal', () => {
      const ast = parse('{{ none }}')
      const output = ast.body[0] as any
      expect(output.expression.value).toBe(null)
    })

    test('parses attribute access', () => {
      const ast = parse('{{ user.name }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('GetAttr')
      expect(output.expression.attribute).toBe('name')
    })

    test('parses nested attribute access', () => {
      const ast = parse('{{ a.b.c }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('GetAttr')
      expect(output.expression.attribute).toBe('c')
      expect(output.expression.object.attribute).toBe('b')
    })

    test('parses index access (DTL style)', () => {
      const ast = parse('{{ items.0 }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('GetAttr')
      expect(output.expression.attribute).toBe('0')
    })

    test('parses subscript access', () => {
      const ast = parse('{{ items[0] }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('GetItem')
    })

    test('parses array literal', () => {
      const ast = parse('{{ [1, 2, 3] }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('Array')
      expect(output.expression.elements.length).toBe(3)
    })

    test('parses object literal', () => {
      const ast = parse('{{ {"key": "value"} }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('Object')
    })
  })

  describe('Filters', () => {
    test('parses simple filter', () => {
      const ast = parse('{{ name|upper }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('FilterExpr')
      expect(output.expression.filter).toBe('upper')
    })

    test('parses filter chain', () => {
      const ast = parse('{{ name|lower|title }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('FilterExpr')
      expect(output.expression.filter).toBe('title')
      expect(output.expression.node.filter).toBe('lower')
    })

    test('parses filter with DTL-style argument', () => {
      const ast = parse('{{ name|default:"N/A" }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('FilterExpr')
      expect(output.expression.filter).toBe('default')
      expect(output.expression.args.length).toBe(1)
    })

    test('parses filter with Jinja-style arguments', () => {
      const ast = parse('{{ name|truncate(30, true) }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('FilterExpr')
      expect(output.expression.args.length).toBe(2)
    })
  })

  describe('Operators', () => {
    test('parses comparison operators', () => {
      const ops = ['==', '!=', '<', '>', '<=', '>=']
      ops.forEach((op) => {
        const ast = parse(`{{ a ${op} b }}`)
        const output = ast.body[0] as any
        expect(output.expression.type).toBe('Compare')
      })
    })

    test('parses arithmetic operators', () => {
      const ops = ['+', '-', '*', '/', '%']
      ops.forEach((op) => {
        const ast = parse(`{{ a ${op} b }}`)
        const output = ast.body[0] as any
        expect(output.expression.type).toBe('BinaryOp')
        expect(output.expression.operator).toBe(op)
      })
    })

    test('parses logical operators', () => {
      const ast = parse('{{ a and b }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('BinaryOp')
      expect(output.expression.operator).toBe('and')
    })

    test('parses not operator', () => {
      const ast = parse('{{ not a }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('UnaryOp')
      expect(output.expression.operator).toBe('not')
    })

    test('parses in operator', () => {
      const ast = parse('{{ a in b }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('Compare')
      expect(output.expression.ops[0].operator).toBe('in')
    })

    test('parses string concatenation', () => {
      const ast = parse('{{ a ~ b }}')
      const output = ast.body[0] as any
      expect(output.expression.type).toBe('BinaryOp')
      expect(output.expression.operator).toBe('~')
    })
  })

  describe('If Tag', () => {
    test('parses simple if', () => {
      const ast = parse('{% if true %}yes{% endif %}')
      expect(ast.body.length).toBe(1)
      expect(ast.body[0].type).toBe('If')
    })

    test('parses if-else', () => {
      const ast = parse('{% if show %}yes{% else %}no{% endif %}')
      const ifNode = ast.body[0] as any
      expect(ifNode.type).toBe('If')
      expect(ifNode.body.length).toBe(1)
      expect(ifNode.else_.length).toBe(1)
    })

    test('parses if-elif-else', () => {
      const ast = parse('{% if a %}1{% elif b %}2{% elif c %}3{% else %}4{% endif %}')
      const ifNode = ast.body[0] as any
      expect(ifNode.type).toBe('If')
      expect(ifNode.elifs.length).toBe(2)
      expect(ifNode.else_.length).toBe(1)
    })

    test('parses nested if', () => {
      const ast = parse('{% if a %}{% if b %}inner{% endif %}{% endif %}')
      const outerIf = ast.body[0] as any
      const innerIf = outerIf.body[0] as any
      expect(innerIf.type).toBe('If')
    })
  })

  describe('For Tag', () => {
    test('parses simple for', () => {
      const ast = parse('{% for item in items %}{{ item }}{% endfor %}')
      const forNode = ast.body[0] as any
      expect(forNode.type).toBe('For')
      expect(forNode.target).toBe('item')
    })

    test('parses for with tuple unpacking', () => {
      const ast = parse('{% for key, value in dict.items %}{{ key }}{% endfor %}')
      const forNode = ast.body[0] as any
      expect(forNode.target).toEqual(['key', 'value'])
    })

    test('parses for-empty (DTL style)', () => {
      const ast = parse('{% for item in items %}{{ item }}{% empty %}none{% endfor %}')
      const forNode = ast.body[0] as any
      expect(forNode.else_.length).toBeGreaterThan(0)
    })

    test('parses for-else (Jinja style)', () => {
      const ast = parse('{% for item in items %}{{ item }}{% else %}none{% endfor %}')
      const forNode = ast.body[0] as any
      expect(forNode.else_.length).toBeGreaterThan(0)
    })
  })

  describe('Block Tag', () => {
    test('parses block', () => {
      const ast = parse('{% block content %}Hello{% endblock %}')
      const blockNode = ast.body[0] as any
      expect(blockNode.type).toBe('Block')
      expect(blockNode.name).toBe('content')
    })

    test('parses block with endblock name', () => {
      const ast = parse('{% block content %}Hello{% endblock content %}')
      const blockNode = ast.body[0] as any
      expect(blockNode.name).toBe('content')
    })
  })

  describe('Extends Tag', () => {
    test('parses extends', () => {
      const ast = parse('{% extends "base.html" %}')
      const extendsNode = ast.body[0] as any
      expect(extendsNode.type).toBe('Extends')
    })

    test('parses extends with variable', () => {
      const ast = parse('{% extends parent_template %}')
      const extendsNode = ast.body[0] as any
      expect(extendsNode.template.type).toBe('Name')
    })
  })

  describe('Include Tag', () => {
    test('parses simple include', () => {
      const ast = parse('{% include "header.html" %}')
      const includeNode = ast.body[0] as any
      expect(includeNode.type).toBe('Include')
    })

    test('parses include with context', () => {
      const ast = parse('{% include "item.html" with item=obj %}')
      const includeNode = ast.body[0] as any
      expect(includeNode.context).not.toBeNull()
    })

    test('parses include only', () => {
      const ast = parse('{% include "item.html" only %}')
      const includeNode = ast.body[0] as any
      expect(includeNode.only).toBe(true)
    })

    test('parses include ignore missing', () => {
      const ast = parse('{% include "item.html" ignore missing %}')
      const includeNode = ast.body[0] as any
      expect(includeNode.ignoreMissing).toBe(true)
    })
  })

  describe('Set/With Tag', () => {
    test('parses set tag', () => {
      const ast = parse('{% set x = 1 %}')
      const setNode = ast.body[0] as any
      expect(setNode.type).toBe('Set')
      expect(setNode.target).toBe('x')
    })

    test('parses with tag', () => {
      const ast = parse('{% with x=1 %}{{ x }}{% endwith %}')
      const withNode = ast.body[0] as any
      expect(withNode.type).toBe('With')
      expect(withNode.assignments.length).toBe(1)
    })

    test('parses with multiple assignments', () => {
      const ast = parse('{% with x=1 y=2 z=3 %}{{ x }}{% endwith %}')
      const withNode = ast.body[0] as any
      expect(withNode.assignments.length).toBe(3)
    })
  })

  describe('Django-specific Tags', () => {
    test('parses load tag', () => {
      const ast = parse('{% load static humanize %}')
      const loadNode = ast.body[0] as any
      expect(loadNode.type).toBe('Load')
      expect(loadNode.names).toContain('static')
      expect(loadNode.names).toContain('humanize')
    })

    test('parses url tag', () => {
      const ast = parse('{% url "view-name" %}')
      const urlNode = ast.body[0] as any
      expect(urlNode.type).toBe('Url')
    })

    test('parses url tag with args', () => {
      const ast = parse('{% url "view-name" pk=123 %}')
      const urlNode = ast.body[0] as any
      expect(urlNode.kwargs).toHaveProperty('pk')
    })

    test('parses url tag with as', () => {
      const ast = parse('{% url "view-name" as the_url %}')
      const urlNode = ast.body[0] as any
      expect(urlNode.asVar).toBe('the_url')
    })

    test('parses static tag', () => {
      const ast = parse('{% static "css/style.css" %}')
      const staticNode = ast.body[0] as any
      expect(staticNode.type).toBe('Static')
    })
  })

  describe('Complex Templates', () => {
    test('parses template with multiple blocks', () => {
      const template = `
        {% extends "base.html" %}
        {% block header %}Header{% endblock %}
        {% block content %}
          {% for item in items %}
            {{ item }}
          {% endfor %}
        {% endblock %}
        {% block footer %}Footer{% endblock %}
      `
      const ast = parse(template)

      const blocks = ast.body.filter((n) => n.type === 'Block')
      expect(blocks.length).toBe(3)
    })

    test('parses Django-style form template', () => {
      const template = `
        {% load static %}
        <form method="POST">
          {% for field in form %}
            <div class="field">
              {{ field.label }}
              {{ field }}
              {% if field.errors %}
                <span class="error">{{ field.errors.0 }}</span>
              {% endif %}
            </div>
          {% endfor %}
          <button type="submit">Submit</button>
        </form>
      `
      const ast = parse(template)
      expect(ast.body.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    test('throws on unclosed if', () => {
      expect(() => parse('{% if true %}hello')).toThrow()
    })

    test('throws on unclosed for', () => {
      expect(() => parse('{% for x in y %}hello')).toThrow()
    })

    test('throws on invalid syntax', () => {
      // {{ a ++ b }} is actually valid (a + (+b) with unary plus)
      // Use truly invalid syntax instead
      expect(() => parse('{{ a @ b }}')).toThrow()
    })

    test('parses unary plus correctly', () => {
      // {{ a ++ b }} should parse as a + (+b)
      const ast = parse('{{ a + +b }}')
      expect(ast.body.length).toBe(1)
    })
  })
})
