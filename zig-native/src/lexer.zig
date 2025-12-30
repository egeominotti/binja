// Binja Lexer - High performance template tokenizer
const std = @import("std");
const Allocator = std.mem.Allocator;

pub const TokenType = enum(u8) {
    TEXT = 0,
    VAR_START = 1, // {{
    VAR_END = 2, // }}
    BLOCK_START = 3, // {%
    BLOCK_END = 4, // %}
    COMMENT_START = 5, // {#
    COMMENT_END = 6, // #}
    IDENTIFIER = 7,
    STRING = 8,
    NUMBER = 9,
    OPERATOR = 10,
    DOT = 11,
    COMMA = 12,
    PIPE = 13,
    COLON = 14,
    LPAREN = 15,
    RPAREN = 16,
    LBRACKET = 17,
    RBRACKET = 18,
    LBRACE = 19,
    RBRACE = 20,
    ASSIGN = 21,
    EOF = 22,
};

pub const Token = struct {
    token_type: TokenType,
    start: u32,
    end: u32,
};

const LexerState = enum {
    TEXT_MODE,
    TAG_MODE,
};

pub const LexerError = enum(u8) {
    NONE = 0,
    UNTERMINATED_STRING = 1,
    UNCLOSED_TAG = 2,
    INVALID_OPERATOR = 3,
    UNEXPECTED_CHAR = 4,
};

pub const Lexer = struct {
    allocator: Allocator,
    source: []const u8,
    pos: u32,
    line: u32,
    state: LexerState,
    tokens: std.ArrayList(Token),
    error_code: LexerError,
    error_pos: u32,

    const Self = @This();

    pub fn init(allocator: Allocator, source: []const u8) !*Self {
        const self = try allocator.create(Self);
        self.* = Self{
            .allocator = allocator,
            .source = source,
            .pos = 0,
            .line = 1,
            .state = .TEXT_MODE,
            .tokens = std.ArrayList(Token).initCapacity(allocator, 64) catch return error.OutOfMemory,
            .error_code = .NONE,
            .error_pos = 0,
        };

        // Tokenize immediately
        self.tokenize() catch {};

        return self;
    }

    pub fn hasError(self: *Self) bool {
        return self.error_code != .NONE;
    }

    pub fn getErrorCode(self: *Self) u8 {
        return @intFromEnum(self.error_code);
    }

    pub fn getErrorLine(self: *Self) u32 {
        // Calculate line number from error position
        var line: u32 = 1;
        var i: u32 = 0;
        while (i < self.error_pos and i < self.source.len) : (i += 1) {
            if (self.source[i] == '\n') line += 1;
        }
        return line;
    }

    fn setError(self: *Self, code: LexerError) void {
        if (self.error_code == .NONE) {
            self.error_code = code;
            self.error_pos = self.pos;
        }
    }

    pub fn deinit(self: *Self) void {
        self.tokens.deinit(self.allocator);
        self.allocator.destroy(self);
    }

    fn tokenize(self: *Self) !void {
        while (self.pos < self.source.len and self.error_code == .NONE) {
            const token = self.nextToken();
            if (self.error_code != .NONE) break;
            try self.tokens.append(self.allocator, token);
            if (token.token_type == .EOF) break;
        }

        // Check for unclosed tags
        if (self.error_code == .NONE and self.state == .TAG_MODE) {
            self.setError(.UNCLOSED_TAG);
        }

        // Ensure EOF
        if (self.tokens.items.len == 0 or self.tokens.items[self.tokens.items.len - 1].token_type != .EOF) {
            try self.tokens.append(self.allocator, Token{
                .token_type = .EOF,
                .start = @intCast(self.source.len),
                .end = @intCast(self.source.len),
            });
        }
    }

    fn current(self: *Self) u8 {
        if (self.pos >= self.source.len) return 0;
        return self.source[self.pos];
    }

    fn peek(self: *Self) u8 {
        if (self.pos + 1 >= self.source.len) return 0;
        return self.source[self.pos + 1];
    }

    fn advance(self: *Self) void {
        if (self.pos < self.source.len) {
            self.pos += 1;
        }
    }

    fn makeToken(self: *Self, token_type: TokenType, start: u32) Token {
        return Token{
            .token_type = token_type,
            .start = start,
            .end = self.pos,
        };
    }

    fn skipWhitespace(self: *Self) void {
        while (self.pos < self.source.len) {
            const c = self.current();
            if (c == ' ' or c == '\t' or c == '\n' or c == '\r') {
                self.advance();
            } else {
                break;
            }
        }
    }

    fn nextToken(self: *Self) Token {
        if (self.pos >= self.source.len) {
            return self.makeToken(.EOF, self.pos);
        }

        if (self.state == .TEXT_MODE) {
            return self.nextTokenTextMode();
        } else {
            return self.nextTokenTagMode();
        }
    }

    fn nextTokenTextMode(self: *Self) Token {
        const c = self.current();
        const start = self.pos;

        if (c == '{') {
            const next = self.peek();
            if (next == '{') {
                self.advance();
                self.advance();
                // Check for {{- (whitespace control)
                if (self.current() == '-') {
                    self.advance();
                }
                self.state = .TAG_MODE;
                return self.makeToken(.VAR_START, start);
            } else if (next == '%') {
                self.advance();
                self.advance();
                // Check for {%- (whitespace control)
                if (self.current() == '-') {
                    self.advance();
                }
                const tag_end = self.pos;

                // Check for raw/verbatim block
                self.skipWhitespace();
                if (self.matchKeyword("raw") or self.matchKeyword("verbatim")) {
                    // Skip to end of block tag
                    self.skipToBlockEnd();
                    // Read raw content until endraw/endverbatim
                    return self.readRawBlock(start);
                }

                // Not raw/verbatim - restore position and return BLOCK_START
                self.pos = tag_end;
                self.state = .TAG_MODE;
                return self.makeToken(.BLOCK_START, start);
            } else if (next == '#') {
                // Skip entire comment - don't emit tokens
                self.advance(); // {
                self.advance(); // #
                self.skipComment();
                // Continue scanning for next token
                return self.nextToken();
            }
        }

        return self.readText();
    }

    fn skipComment(self: *Self) void {
        // Skip until #}
        while (self.pos < self.source.len) {
            if (self.current() == '#' and self.peek() == '}') {
                self.advance(); // #
                self.advance(); // }
                break;
            }
            self.advance();
        }
    }

    fn matchKeyword(self: *Self, keyword: []const u8) bool {
        const start_pos = self.pos;
        for (keyword) |ch| {
            if (self.pos >= self.source.len) {
                self.pos = start_pos;
                return false;
            }
            const c = self.current();
            // Case insensitive match
            const lower_c = if (c >= 'A' and c <= 'Z') c + 32 else c;
            const lower_ch = if (ch >= 'A' and ch <= 'Z') ch + 32 else ch;
            if (lower_c != lower_ch) {
                self.pos = start_pos;
                return false;
            }
            self.advance();
        }
        // Check that keyword ends (not part of larger identifier)
        if (self.pos < self.source.len) {
            const c = self.current();
            if (isAlphaNumeric(c) or c == '_') {
                self.pos = start_pos;
                return false;
            }
        }
        return true;
    }

    fn skipToBlockEnd(self: *Self) void {
        // Skip whitespace control and closing %}
        self.skipWhitespace();
        if (self.current() == '-') self.advance();
        if (self.current() == '%' and self.peek() == '}') {
            self.advance();
            self.advance();
        }
    }

    fn readRawBlock(self: *Self, block_start: u32) Token {
        const content_start = self.pos;
        _ = block_start;

        // Find {% endraw %} or {% endverbatim %}
        while (self.pos < self.source.len) {
            if (self.current() == '{' and self.peek() == '%') {
                const tag_start = self.pos;
                self.advance(); // {
                self.advance(); // %
                if (self.current() == '-') self.advance();
                self.skipWhitespace();

                if (self.matchKeyword("endraw") or self.matchKeyword("endverbatim")) {
                    // Found end tag - emit TEXT token for content
                    const content_end = tag_start;
                    self.skipWhitespace();
                    if (self.current() == '-') self.advance();
                    self.skipToBlockEnd();

                    if (content_end > content_start) {
                        return Token{
                            .token_type = .TEXT,
                            .start = content_start,
                            .end = content_end,
                        };
                    } else {
                        // Empty raw block, continue to next token
                        return self.nextToken();
                    }
                }
            }
            self.advance();
        }

        // Unclosed raw block - return remaining as TEXT
        if (self.pos > content_start) {
            return Token{
                .token_type = .TEXT,
                .start = content_start,
                .end = self.pos,
            };
        }
        return self.makeToken(.EOF, self.pos);
    }

    fn nextTokenTagMode(self: *Self) Token {
        self.skipWhitespace();

        if (self.pos >= self.source.len) {
            return self.makeToken(.EOF, self.pos);
        }

        const c = self.current();
        var start = self.pos;

        // Check for whitespace control before tag end: -}} or -%}
        if (c == '-') {
            const next = self.peek();
            if (next == '}' or next == '%') {
                self.advance(); // skip the -
                start = self.pos; // token starts after -
            }
        }

        const current_char = self.current();

        // Check for tag end
        if (current_char == '}' and self.peek() == '}') {
            self.advance();
            self.advance();
            self.state = .TEXT_MODE;
            return self.makeToken(.VAR_END, start);
        }

        if (current_char == '%' and self.peek() == '}') {
            self.advance();
            self.advance();
            self.state = .TEXT_MODE;
            return self.makeToken(.BLOCK_END, start);
        }

        if (current_char == '#' and self.peek() == '}') {
            self.advance();
            self.advance();
            self.state = .TEXT_MODE;
            return self.makeToken(.COMMENT_END, start);
        }

        // Single character tokens
        switch (current_char) {
            '.' => {
                self.advance();
                return self.makeToken(.DOT, start);
            },
            ',' => {
                self.advance();
                return self.makeToken(.COMMA, start);
            },
            '|' => {
                self.advance();
                return self.makeToken(.PIPE, start);
            },
            ':' => {
                self.advance();
                return self.makeToken(.COLON, start);
            },
            '(' => {
                self.advance();
                return self.makeToken(.LPAREN, start);
            },
            ')' => {
                self.advance();
                return self.makeToken(.RPAREN, start);
            },
            '[' => {
                self.advance();
                return self.makeToken(.LBRACKET, start);
            },
            ']' => {
                self.advance();
                return self.makeToken(.RBRACKET, start);
            },
            '{' => {
                self.advance();
                return self.makeToken(.LBRACE, start);
            },
            '}' => {
                self.advance();
                return self.makeToken(.RBRACE, start);
            },
            '=' => {
                if (self.peek() == '=') {
                    self.advance();
                    self.advance();
                    return self.makeToken(.OPERATOR, start);
                }
                self.advance();
                return self.makeToken(.ASSIGN, start);
            },
            else => {},
        }

        // String literals
        if (c == '"' or c == '\'') {
            return self.readString(c);
        }

        // Numbers
        if (isDigit(c)) {
            return self.readNumber();
        }

        // Identifiers
        if (isAlpha(c) or c == '_') {
            return self.readIdentifier();
        }

        // Operators
        if (isOperatorChar(c)) {
            return self.readOperator();
        }

        // Unknown - skip
        self.advance();
        return self.nextToken();
    }

    fn readString(self: *Self, quote: u8) Token {
        const start = self.pos;
        self.advance(); // skip opening quote

        while (self.pos < self.source.len) {
            const c = self.current();
            if (c == quote) {
                self.advance(); // skip closing quote
                return self.makeToken(.STRING, start);
            }
            if (c == '\\' and self.pos + 1 < self.source.len) {
                self.advance(); // skip escape
            }
            self.advance();
        }

        // Reached end without closing quote
        self.setError(.UNTERMINATED_STRING);
        return self.makeToken(.STRING, start);
    }

    fn readNumber(self: *Self) Token {
        const start = self.pos;

        while (self.pos < self.source.len and isDigit(self.current())) {
            self.advance();
        }

        // Decimal part
        if (self.current() == '.' and isDigit(self.peek())) {
            self.advance();
            while (self.pos < self.source.len and isDigit(self.current())) {
                self.advance();
            }
        }

        return self.makeToken(.NUMBER, start);
    }

    fn readIdentifier(self: *Self) Token {
        const start = self.pos;

        while (self.pos < self.source.len) {
            const c = self.current();
            if (!isAlphaNumeric(c) and c != '_') break;
            self.advance();
        }

        return self.makeToken(.IDENTIFIER, start);
    }

    fn readOperator(self: *Self) Token {
        const start = self.pos;
        const c = self.current();

        // Multi-char operators: ==, !=, <=, >=
        if ((c == '=' or c == '!' or c == '<' or c == '>') and self.peek() == '=') {
            self.advance();
            self.advance();
            return self.makeToken(.OPERATOR, start);
        }

        // ! alone is invalid (must be !=)
        if (c == '!') {
            self.setError(.UNEXPECTED_CHAR);
            self.advance();
            return self.makeToken(.OPERATOR, start);
        }

        // Single char operator
        self.advance();
        return self.makeToken(.OPERATOR, start);
    }

    fn readText(self: *Self) Token {
        const start = self.pos;

        while (self.pos < self.source.len) {
            const c = self.current();

            if (c == '{') {
                const next = self.peek();
                if (next == '{' or next == '%' or next == '#') break;
            }

            self.advance();
        }

        if (self.pos == start) {
            return self.makeToken(.EOF, start);
        }

        return self.makeToken(.TEXT, start);
    }

    // Get token value as slice
    pub fn getTokenValue(self: *Self, index: usize) []const u8 {
        if (index >= self.tokens.items.len) return "";
        const token = self.tokens.items[index];
        return self.source[token.start..token.end];
    }
};

// Helper functions
fn isDigit(c: u8) bool {
    return c >= '0' and c <= '9';
}

fn isAlpha(c: u8) bool {
    return (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z');
}

fn isAlphaNumeric(c: u8) bool {
    return isAlpha(c) or isDigit(c);
}

fn isOperatorChar(c: u8) bool {
    return c == '+' or c == '-' or c == '*' or c == '/' or
        c == '=' or c == '!' or c == '<' or c == '>' or
        c == '~' or c == '%';
}

// Tests
test "basic tokenization" {
    const source = "Hello {{ name }}!";
    var lex = try Lexer.init(std.testing.allocator, source);
    defer lex.deinit();

    try std.testing.expect(lex.tokens.items.len == 6); // TEXT, VAR_START, IDENTIFIER, VAR_END, TEXT, EOF
}

test "block tag" {
    const source = "{% for x in items %}test{% endfor %}";
    var lex = try Lexer.init(std.testing.allocator, source);
    defer lex.deinit();

    try std.testing.expect(lex.tokens.items[0].token_type == .BLOCK_START);
}
