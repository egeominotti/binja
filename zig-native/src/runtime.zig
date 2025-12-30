// Binja Runtime - Template rendering engine
const std = @import("std");
const Allocator = std.mem.Allocator;
const lexer = @import("lexer.zig");
const parser = @import("parser.zig");

pub fn render(
    allocator: Allocator,
    template: []const u8,
    context_json: []const u8,
) ![*:0]u8 {
    _ = context_json; // TODO: parse context

    // Tokenize
    var lex = try lexer.Lexer.init(allocator, template);
    defer lex.deinit();

    // Parse
    var ast = try parser.parse(allocator, lex);
    defer ast.deinit(allocator);

    // Render (simple version - just concatenate text nodes)
    var output = try std.ArrayList(u8).initCapacity(allocator, 1024);
    defer output.deinit(allocator);

    for (ast.nodes.items) |node| {
        switch (node.node_type) {
            .Text => {
                const text = template[node.data_start .. node.data_start + node.data_len];
                try output.appendSlice(allocator, text);
            },
            .Output => {
                // TODO: evaluate expression and render
                try output.appendSlice(allocator, "[output]");
            },
            else => {},
        }
    }

    // Add null terminator and return
    try output.append(allocator, 0);

    const result = try allocator.alloc(u8, output.items.len);
    @memcpy(result, output.items);
    return @ptrCast(result.ptr);
}
