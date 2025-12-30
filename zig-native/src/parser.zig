// Binja Parser - Converts tokens to AST
const std = @import("std");
const Allocator = std.mem.Allocator;
const lexer = @import("lexer.zig");

pub const NodeType = enum {
    Template,
    Text,
    Output,
    If,
    For,
    Block,
    Extends,
    Include,
    Set,
    With,
    Name,
    Literal,
    GetAttr,
    GetItem,
    FilterExpr,
    BinaryOp,
    UnaryOp,
    Compare,
    Array,
    Object,
    FunctionCall,
};

pub const Node = struct {
    node_type: NodeType,
    // Using indices into a separate data array for values
    data_start: u32,
    data_len: u32,
    children_start: u32,
    children_len: u32,
};

pub const AST = struct {
    allocator: Allocator,
    nodes: std.ArrayList(Node),
    data: std.ArrayList(u8), // String data storage
    source: []const u8,

    const Self = @This();

    pub fn init(allocator: Allocator, source: []const u8) !*Self {
        const self = try allocator.create(Self);
        self.* = Self{
            .allocator = allocator,
            .nodes = std.ArrayList(Node).initCapacity(allocator, 32) catch return error.OutOfMemory,
            .data = std.ArrayList(u8).initCapacity(allocator, 256) catch return error.OutOfMemory,
            .source = source,
        };
        return self;
    }

    pub fn deinit(self: *Self, allocator: Allocator) void {
        self.nodes.deinit(allocator);
        self.data.deinit(allocator);
        allocator.destroy(self);
    }

    pub fn toJson(self: *Self, allocator: Allocator) ![*:0]u8 {
        // Simple JSON serialization
        var buffer = try std.ArrayList(u8).initCapacity(allocator, 256);
        defer buffer.deinit(allocator);

        try buffer.appendSlice(allocator, "{\"type\":\"Template\",\"body\":[");

        // Serialize nodes
        for (self.nodes.items, 0..) |node, i| {
            if (i > 0) try buffer.append(allocator, ',');
            try buffer.appendSlice(allocator, "{\"type\":\"");
            try buffer.appendSlice(allocator, @tagName(node.node_type));
            try buffer.appendSlice(allocator, "\"}");
        }

        try buffer.appendSlice(allocator, "]}");
        try buffer.append(allocator, 0); // null terminator

        const result = try allocator.alloc(u8, buffer.items.len);
        @memcpy(result, buffer.items);
        return @ptrCast(result.ptr);
    }
};

pub fn parse(allocator: Allocator, lex: *lexer.Lexer) !*AST {
    var ast = try AST.init(allocator, lex.source);
    var current: usize = 0;

    while (current < lex.tokens.items.len) {
        const token = lex.tokens.items[current];

        switch (token.token_type) {
            .TEXT => {
                try ast.nodes.append(allocator, Node{
                    .node_type = .Text,
                    .data_start = token.start,
                    .data_len = token.end - token.start,
                    .children_start = 0,
                    .children_len = 0,
                });
                current += 1;
            },
            .VAR_START => {
                // Skip {{ and find }}
                current += 1;
                const expr_start = current;

                // Find VAR_END
                while (current < lex.tokens.items.len and
                    lex.tokens.items[current].token_type != .VAR_END)
                {
                    current += 1;
                }

                try ast.nodes.append(allocator, Node{
                    .node_type = .Output,
                    .data_start = @intCast(expr_start),
                    .data_len = @intCast(current - expr_start),
                    .children_start = 0,
                    .children_len = 0,
                });

                current += 1; // skip }}
            },
            .BLOCK_START => {
                // Skip {% and read tag name
                current += 1;

                if (current < lex.tokens.items.len) {
                    const tag_token = lex.tokens.items[current];
                    const tag_name = lex.source[tag_token.start..tag_token.end];

                    if (std.mem.eql(u8, tag_name, "if")) {
                        try ast.nodes.append(allocator, Node{
                            .node_type = .If,
                            .data_start = tag_token.start,
                            .data_len = tag_token.end - tag_token.start,
                            .children_start = 0,
                            .children_len = 0,
                        });
                    } else if (std.mem.eql(u8, tag_name, "for")) {
                        try ast.nodes.append(allocator, Node{
                            .node_type = .For,
                            .data_start = tag_token.start,
                            .data_len = tag_token.end - tag_token.start,
                            .children_start = 0,
                            .children_len = 0,
                        });
                    } else if (std.mem.eql(u8, tag_name, "block")) {
                        try ast.nodes.append(allocator, Node{
                            .node_type = .Block,
                            .data_start = tag_token.start,
                            .data_len = tag_token.end - tag_token.start,
                            .children_start = 0,
                            .children_len = 0,
                        });
                    }
                }

                // Skip to %}
                while (current < lex.tokens.items.len and
                    lex.tokens.items[current].token_type != .BLOCK_END)
                {
                    current += 1;
                }
                current += 1;
            },
            .EOF => break,
            else => current += 1,
        }
    }

    return ast;
}
