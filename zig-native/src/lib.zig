// Binja Native - High-performance template engine in Zig
// Exports C ABI functions for Bun FFI

const std = @import("std");
const lexer = @import("lexer.zig");
const parser = @import("parser.zig");
const runtime = @import("runtime.zig");

// ============================================================================
// Memory Management
// ============================================================================

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

/// Allocate memory (for JS to pass strings)
export fn binja_alloc(size: usize) ?[*]u8 {
    const slice = allocator.alloc(u8, size) catch return null;
    return slice.ptr;
}

/// Free memory
export fn binja_free(ptr: [*]u8, size: usize) void {
    allocator.free(ptr[0..size]);
}

/// Free a null-terminated string
export fn binja_free_string(ptr: [*:0]u8) void {
    const len = std.mem.len(ptr);
    allocator.free(ptr[0 .. len + 1]);
}

// ============================================================================
// Lexer API
// ============================================================================

/// Create a new lexer instance
export fn binja_lexer_new(source: [*]const u8, source_len: usize) ?*lexer.Lexer {
    return lexer.Lexer.init(allocator, source[0..source_len]) catch null;
}

/// Free lexer
export fn binja_lexer_free(lex: *lexer.Lexer) void {
    lex.deinit();
}

/// Get token count
export fn binja_lexer_token_count(lex: *lexer.Lexer) usize {
    return lex.tokens.items.len;
}

/// Get token type at index
export fn binja_lexer_token_type(lex: *lexer.Lexer, index: usize) u8 {
    if (index >= lex.tokens.items.len) return 0;
    return @intFromEnum(lex.tokens.items[index].token_type);
}

/// Get token start position
export fn binja_lexer_token_start(lex: *lexer.Lexer, index: usize) u32 {
    if (index >= lex.tokens.items.len) return 0;
    return lex.tokens.items[index].start;
}

/// Get token end position
export fn binja_lexer_token_end(lex: *lexer.Lexer, index: usize) u32 {
    if (index >= lex.tokens.items.len) return 0;
    return lex.tokens.items[index].end;
}

/// Check if lexer has error
export fn binja_lexer_has_error(lex: *lexer.Lexer) bool {
    return lex.hasError();
}

/// Get error code (0 = none, 1 = unterminated string, 2 = unclosed tag, etc)
export fn binja_lexer_error_code(lex: *lexer.Lexer) u8 {
    return lex.getErrorCode();
}

/// Get error line number
export fn binja_lexer_error_line(lex: *lexer.Lexer) u32 {
    return lex.getErrorLine();
}

/// Get all tokens as packed buffer (BATCH API - single FFI call)
/// Format: [count:u32][token1: type:u8, start:u32, end:u32][token2: ...]
/// Returns pointer to buffer, size via binja_lexer_tokens_buffer_size
export fn binja_lexer_get_tokens_buffer(lex: *lexer.Lexer) ?[*]u8 {
    const count = lex.tokens.items.len;
    const buffer_size = 4 + (count * 9); // 4 bytes count + 9 bytes per token

    const buffer = allocator.alloc(u8, buffer_size) catch return null;

    // Write count (little-endian u32)
    const count_u32: u32 = @intCast(count);
    buffer[0] = @truncate(count_u32);
    buffer[1] = @truncate(count_u32 >> 8);
    buffer[2] = @truncate(count_u32 >> 16);
    buffer[3] = @truncate(count_u32 >> 24);

    // Write tokens
    var offset: usize = 4;
    for (lex.tokens.items) |token| {
        // type (u8)
        buffer[offset] = @intFromEnum(token.token_type);
        offset += 1;

        // start (u32 little-endian)
        buffer[offset] = @truncate(token.start);
        buffer[offset + 1] = @truncate(token.start >> 8);
        buffer[offset + 2] = @truncate(token.start >> 16);
        buffer[offset + 3] = @truncate(token.start >> 24);
        offset += 4;

        // end (u32 little-endian)
        buffer[offset] = @truncate(token.end);
        buffer[offset + 1] = @truncate(token.end >> 8);
        buffer[offset + 2] = @truncate(token.end >> 16);
        buffer[offset + 3] = @truncate(token.end >> 24);
        offset += 4;
    }

    return buffer.ptr;
}

/// Get buffer size for tokens
export fn binja_lexer_tokens_buffer_size(lex: *lexer.Lexer) usize {
    return 4 + (lex.tokens.items.len * 9);
}

/// Free tokens buffer
export fn binja_free_tokens_buffer(ptr: [*]u8, size: usize) void {
    allocator.free(ptr[0..size]);
}

// ============================================================================
// Parser API
// ============================================================================

/// Parse tokens into AST, returns JSON representation
export fn binja_parse(lex: *lexer.Lexer) ?[*:0]u8 {
    const ast = parser.parse(allocator, lex) catch return null;
    defer ast.deinit(allocator);

    // Serialize AST to JSON
    const json = ast.toJson(allocator) catch return null;
    return json;
}

// ============================================================================
// Render API (Full Pipeline)
// ============================================================================

/// Render template with context (JSON string)
export fn binja_render(
    template: [*]const u8,
    template_len: usize,
    context_json: [*]const u8,
    context_len: usize,
) ?[*:0]u8 {
    return runtime.render(
        allocator,
        template[0..template_len],
        context_json[0..context_len],
    ) catch null;
}

/// Quick tokenize - returns token count (for benchmarks)
export fn binja_tokenize_count(source: [*]const u8, source_len: usize) usize {
    var lex = lexer.Lexer.init(allocator, source[0..source_len]) catch return 0;
    defer lex.deinit();
    return lex.tokens.items.len;
}

// ============================================================================
// Version
// ============================================================================

export fn binja_version() [*:0]const u8 {
    return "0.1.0";
}

// ============================================================================
// Tests
// ============================================================================

test "basic lexer" {
    const source = "Hello {{ name }}!";
    var lex = try lexer.Lexer.init(std.testing.allocator, source);
    defer lex.deinit();

    try std.testing.expect(lex.tokens.items.len > 0);
}
