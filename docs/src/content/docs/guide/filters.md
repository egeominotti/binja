---
title: Built-in Filters (91 registry entries)
description: Reference for Binja's built-in filters and aliases
---

`builtinFilters` currently exposes **91 registry entries**, including aliases such as `e`, `d`, and `tojson`. The tables group related public names; the registry exported by the installed package is authoritative.

## String filters

| Filter | Description | Example |
|--------|-------------|---------|
| `upper` | Uppercase | `{{ "hello"\|upper }}` → `HELLO` |
| `lower` | Lowercase | `{{ "HELLO"\|lower }}` → `hello` |
| `capitalize` | First letter uppercase | `{{ "hello"\|capitalize }}` → `Hello` |
| `capfirst` | First char uppercase | `{{ "hello"\|capfirst }}` → `Hello` |
| `title` | Title case | `{{ "hello world"\|title }}` → `Hello World` |
| `trim` | Strip whitespace | `{{ "  hi  "\|trim }}` → `hi` |
| `striptags` | Remove HTML tags | `{{ "<p>Hi</p>"\|striptags }}` → `Hi` |
| `slugify` | URL-friendly slug | `{{ "Hello World!"\|slugify }}` → `hello-world` |
| `truncatechars` | Truncate to N chars | `{{ "hello"\|truncatechars:3 }}` → `hel...` |
| `truncatewords` | Truncate to N words | `{{ "a b c d"\|truncatewords:2 }}` → `a b...` |
| `truncatechars_html` | Truncate preserving HTML | Preserves HTML tags |
| `truncatewords_html` | Truncate words in HTML | Preserves HTML tags |
| `wordcount` | Count words | `{{ "hello world"\|wordcount }}` → `2` |
| `wordwrap` | Wrap at N chars | `{{ text\|wordwrap:40 }}` |
| `center` | Center in N chars | `{{ "hi"\|center:10 }}` → `    hi    ` |
| `ljust` | Left justify | `{{ "hi"\|ljust:10 }}` → `hi        ` |
| `rjust` | Right justify | `{{ "hi"\|rjust:10 }}` → `        hi` |
| `cut` | Remove substring | `{{ "hello"\|cut:"l" }}` → `heo` |
| `replace` | Replace substring | `{{ "hello"\|replace:"l","x" }}` → `hexxo` |
| `indent` | Indent lines | `{{ text\|indent:4 }}` |
| `linebreaks` | Newlines to `<p>/<br>` | Converts to HTML |
| `linebreaksbr` | Newlines to `<br>` | Converts to HTML |
| `linenumbers` | Add line numbers | Numbers each line |
| `addslashes` | Escape quotes | `{{ "it's"\|addslashes }}` → `it\'s` |
| `format` | sprintf-style format | `{{ "Hi %s"\|format:name }}` |
| `stringformat` | Python % format | `{{ 5\|stringformat:"03d" }}` → `005` |

## Number filters

| Filter | Description | Example |
|--------|-------------|---------|
| `abs` | Absolute value | `{{ -5\|abs }}` → `5` |
| `int` | Convert to integer | `{{ "42"\|int }}` → `42` |
| `float` | Convert to float | `{{ "3.14"\|float }}` → `3.14` |
| `round` | Round number | `{{ 3.7\|round }}` → `4` |
| `add` | Add number | `{{ 5\|add:3 }}` → `8` |
| `divisibleby` | Check divisibility | `{{ 10\|divisibleby:2 }}` → `true` |
| `floatformat` | Format decimal places | `{{ 3.14159\|floatformat:2 }}` → `3.14` |
| `filesizeformat` | Human file size | `{{ 1048576\|filesizeformat }}` → `1.0 MB` |
| `get_digit` | Get Nth digit | `{{ 12345\|get_digit:2 }}` → `4` |

## List/array filters

| Filter | Description | Example |
|--------|-------------|---------|
| `length` | List length | `{{ items\|length }}` → `3` |
| `length_is` | Check length | `{{ items\|length_is:3 }}` → `true` |
| `first` | First item | `{{ items\|first }}` |
| `last` | Last item | `{{ items\|last }}` |
| `join` | Join with separator | `{{ items\|join:", " }}` → `a, b, c` |
| `slice` | Slice list | `{{ items\|slice:":2" }}` |
| `reverse` | Reverse list | `{{ items\|reverse }}` |
| `sort` | Sort list | `{{ items\|sort }}` |
| `unique` | Remove duplicates | `{{ items\|unique }}` |
| `batch` | Group into batches | `{{ items\|batch:2 }}` |
| `columns` | Split into columns | `{{ items\|columns:3 }}` |
| `dictsort` | Sort dict by key | `{{ dict\|dictsort }}` |
| `dictsortreversed` | Sort dict reversed | `{{ dict\|dictsortreversed }}` |
| `groupby` | Group by attribute | `{{ items\|groupby:"category" }}` |
| `random` | Random item | `{{ items\|random }}` |
| `list` | Convert to list | `{{ value\|list }}` |
| `make_list` | String to char list | `{{ "abc"\|make_list }}` |
| `map` | Map attribute | `{{ items\|map:"name" }}` |
| `select` | Filter by test | `{{ items\|select:"even" }}` |
| `reject` | Reject by test | `{{ items\|reject:"none" }}` |
| `selectattr` | Filter by attr test | `{{ items\|selectattr:"active" }}` |
| `rejectattr` | Reject by attr test | `{{ items\|rejectattr:"hidden" }}` |

## Math filters

| Filter | Description | Example |
|--------|-------------|---------|
| `max` | Maximum value | `{{ items\|max }}` |
| `min` | Minimum value | `{{ items\|min }}` |
| `sum` | Sum of values | `{{ items\|sum }}` |
| `attr` | Get attribute | `{{ item\|attr:"name" }}` |

## Date/time filters

| Filter | Description | Example |
|--------|-------------|---------|
| `date` | Format date | `{{ now\|date:"Y-m-d" }}` → `2024-01-15` |
| `time` | Format time | `{{ now\|time:"H:i" }}` → `14:30` |
| `timesince` | Time since date | `{{ past\|timesince }}` → `2 days ago` |
| `timeuntil` | Time until date | `{{ future\|timeuntil }}` → `in 3 hours` |

### Timezone Support

```typescript
const env = new Environment({
  timezone: 'Europe/Rome'  // All dates in Rome timezone
})
```

## Safety and encoding filters

| Filter | Description | Example |
|--------|-------------|---------|
| `escape` / `e` | HTML escape | `{{ html\|escape }}` |
| `forceescape` | Force HTML escape | `{{ html\|forceescape }}` |
| `safe` | Mark as safe | `{{ html\|safe }}` |
| `safeseq` | Mark sequence safe | `{{ items\|safeseq }}` |
| `escapejs` | JS string escape | `{{ text\|escapejs }}` |
| `urlencode` | URL encode | `{{ url\|urlencode }}` |
| `iriencode` | IRI encode | `{{ url\|iriencode }}` |
| `urlize` | URLs to links | `{{ text\|urlize }}` |
| `urlizetrunc` | URLs to links (truncated) | `{{ text\|urlizetrunc:15 }}` |
| `json` / `tojson` | HTML-safe JSON serialization | `{{ data\|json }}` |
| `json_script` | Safe JSON in script | `{{ data\|json_script:"id" }}` |
| `pprint` | Pretty print as normally escaped text | `{{ data\|pprint }}` |
| `xmlattr` | Validate names and generate escaped XML/HTML attrs | `{{ attrs\|xmlattr }}` |

## Default/conditional filters

| Filter | Description | Example |
|--------|-------------|---------|
| `default` / `d` | Default value | `{{ missing\|default:"N/A" }}` |
| `default_if_none` | Default if null | `{{ val\|default_if_none:"None" }}` |
| `yesno` | Boolean to text | `{{ true\|yesno:"Yes,No" }}` → `Yes` |
| `pluralize` | Pluralize suffix | `{{ count\|pluralize }}` → `s` |

## Mapping and miscellaneous filters

| Filter | Description | Example |
|--------|-------------|---------|
| `items` | Dict to pairs | `{% for k,v in dict\|items %}` |
| `keys` | Mapping keys | `{% for key in dict\|keys %}` |
| `merge` | Merge mappings/arrays | `{{ left\|merge:right }}` |
| `unordered_list` | Nested list to HTML | `{{ items\|unordered_list }}` |

## Validation and safety notes

- `batch`, `columns`, and `wordwrap` reject non-positive step/width values instead of looping forever.
- Attribute-oriented filters use protected property lookup and cannot read blocked prototype primitives.
- `json`/`tojson` and `json_script` escape HTML-significant JSON characters; do not append `safe` to untrusted serialization manually.
- `safe` and `safeseq` are trust assertions. They do not sanitize input.
- HTML-producing filters escape untrusted text before marking their generated markup safe.
- `xmlattr` rejects invalid attribute names and escapes values.

## Filter Chaining

Filters can be chained together:

```jinja
{{ name|lower|capitalize|truncatechars:20 }}
{{ items|sort|reverse|join:", " }}
{{ price|floatformat:2|default:"N/A" }}
```

## Programmatic registry

```ts
import { builtinFilters } from 'binja'

const names = Object.keys(builtinFilters) // 91 in this release
```
