/* minlog.js
 * minimal logical language for combining flags.
 * supports parentheses, AND, OR, TRUE, FALSE, NOT(). 
 * Everything else is assumed to be a setting name.
 * e.g. x > 5 AND (x == 56 OR x < 26)
 * e.g. NOT(BannedForever)
 * 
 * todo: 
 *  [+] not operator (only parenthetical)
 *  [+] case-insensitive parsing mode (iT IS suPeR inSENSitiVe)
 */

"use strict";

/** 
 * @typedef {Object} Expression
 * @property {string} [value] setting name
 * @property {string} expression expression type
 * @property {Expression} [left] left subexpression
 * @property {Expression} [right] right subexpression
 * @property {number} arity number of stack operands this expression expects
 */

/**
 * @typedef {Object} Token
 * @property {string} type token type
 */

/**
 * Create a literal expression
 * @param {boolean} value 
 */
function LiteralExpression(value) {
    return {
        expression: 'LITERAL',
        value: value,
        arity: 0
    };
}

/**
 * Create a setting expression
 * @param {string} value 
 * @returns {Expression}
 */
function SettingExpression(value) {
    return {
        expression: 'SETTING',
        value: value,
        arity: 0
    };
}

/**
 * Create a binary expression
 * @param {string} type
 * @param {Expression} [left]
 * @param {Expression} [right]
 * @returns {Expression}
 */
function BinaryExpression(type, left, right) {
    return {
        expression: type,
        left: left,
        right: right,
        arity: 2
    };
}

/**
 * Create a unary expression
 * @param {string} type 
 * @param {Expression} main
 * @returns {Expression} 
 */
function UnaryExpression(type, main) {
    return {
        expression: type,
        left: main,
        arity: 1
    };
}

/**
 * Create a unary not expression
 * @param {string} type 
 * @param {Expression} main 
 * @returns {Expression}
 */
function NotExpression(main) {
    return UnaryExpression("NOT", main);
}

/**
 * Create an and expression
 * @param {Expression} [left]
 * @param {Expression} [right]
 * @returns {Expression}
 */
function AndExpression(left, right) {
    return BinaryExpression("AND", left, right);
}

/**
 * Create an or expression
 * @param {Expression} [left]
 * @param {Expression} [right] 
 * @returns {Expression}
 */
function OrExpression(left, right) {
    return BinaryExpression("OR", left, right);
}

/**
 * Enum for token types
 * @readonly
 * @enum {string}
 */
var TOKEN = {
    NAME: "NameToken",
    AND: "AndToken",
    OR: "OrToken",
    OPEN: "(Token",
    CLOSE: ")Token",
    TRUE: "TrueToken",
    FALSE: "FalseToken",
    NOT: "NotToken"
};

/**
 * Create name token
 * @param {string} name
 * @returns {Token}
 */
function NameToken(name) {
    return {
        type: TOKEN.NAME,
        value: name
    };
}

/** @type {Token} */
var TrueToken = {
    type: TOKEN.TRUE,
    value: true
};

/** @type {Token} */
var FalseToken = {
    type: TOKEN.FALSE,
    value: false
};

/** @type {Token} */
var NotToken = {
    type: TOKEN.NOT
};

/** @type {Token} */
var AndToken = {
    type: TOKEN.AND
};

/** @type {Token} */
var OrToken = {
    type: TOKEN.OR
};

/** @type {Token} */
var OpenParenthesisToken = {
    type: TOKEN.OPEN
};

/** @type {Token} */
var CloseParenthesisToken = {
    type: TOKEN.CLOSE
};

/**
 * Trim leading spaces and parentheses from an expression string
 * @param {string} precedingExpression 
 * @returns {string}
 */
function TrimLeadingSpaceAndParentheses(precedingExpression) {
    precedingExpression = precedingExpression.trim();
    var leadingParentheses = 0;
    while(leadingParentheses < precedingExpression.length && precedingExpression[leadingParentheses] === '(') leadingParentheses++;
    return precedingExpression.substring(leadingParentheses);
}

var patternToToken = {
    "NOT(": NotToken,
    "(": OpenParenthesisToken,
    ")": CloseParenthesisToken,
    "AND": AndToken,
    "OR": OrToken
};

/**
 * Add tokens from current expression to token array if it matches pattern
 * @param {string} currentExpression 
 * @param {string} pattern 
 * @param {Token[]} tokens
 * @returns {number} number of characters to advance the current location
 */
function CreateToken(currentExpression, pattern, tokens) {
    var advance = 0;
    var token = patternToToken[pattern];
    if (pattern === "AND" || pattern === "OR") {
        pattern = " " + pattern;
    }
    var upperExpression = currentExpression.toUpperCase();
    if (upperExpression.endsWith(pattern)) {
        var isUnaryExpression = token === NotToken;
        var precedingStart = upperExpression.indexOf(pattern);
        var precedingExpression = currentExpression.substring(0, precedingStart);
        precedingExpression = TrimLeadingSpaceAndParentheses(precedingExpression);
        if (isUnaryExpression) {
            if (precedingExpression.length > 0) throw "Unexpected " + precedingExpression;
        } else {
            var nameToken = CreateNameToken(precedingExpression);
            if (nameToken) tokens.push(nameToken);
        }
        tokens.push(token);
        if (isUnaryExpression) tokens.push(OpenParenthesisToken);
        advance = currentExpression.length;
    }
    return advance;
}

/**
 * Create a name token or TRUE or FALSE literal based on given name
 * @param {string} name 
 */
function CreateNameToken(name) {
    var token = null;
    var nameUpper = name.toUpperCase();
    if (nameUpper === "TRUE") {
        token = TrueToken;
    } else if (nameUpper === "FALSE") {
        token = FalseToken;
    } else if (typeof(name) === "string" && name.trim().length > 0) {
        token = NameToken(name.trim());
    }
    return token;
}

/**
 * Transform a string representing a logical expression into an array of tokens
 * @param {string} logicalExpression 
 * @returns {Token[]} token array
 */
function mllex(logicalExpression) {
    var tokens = [];
    var startingAt = 0;
    for (var i = 0; i < logicalExpression.length; i++) {
        var currentChar = logicalExpression[i];
        switch (currentChar) {
            case '(':
            case ')':
            case 'D':
            case 'd':
            case 'R':
            case 'r':
                var currentExpression = logicalExpression.substring(startingAt, i + 1);
                switch (currentChar) {
                    case '(':
                        startingAt += CreateToken(currentExpression, "NOT(", tokens)
                                   || CreateToken(currentExpression, "(", tokens);
                        break;
                    case ')':
                        startingAt += CreateToken(currentExpression, ")", tokens);
                        break;
                    case 'D':
                    case 'd':
                        startingAt += CreateToken(currentExpression, "AND", tokens);
                        break;
                    case 'R':
                    case 'r':
                        startingAt += CreateToken(currentExpression, "OR", tokens);
                        break;
                }
                break;
        }
    }
    //trailing expression
    if (startingAt !== logicalExpression.length) {
        var name = logicalExpression.substring(startingAt).trim();
        tokens.push(CreateNameToken(name));
    }
    return tokens;
}

/**
 * Transform a token list into an ordered expression stack
 * @param {Token[]} tokens 
 * @returns {Expression[]} ordered expression stack
 */
function mlparse(tokens) {
    var args = [];
    var ops = [];
    for(var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        switch(token.type) {
            case TOKEN.NOT:
            case TOKEN.OPEN:
                //Read all tokens until matching close parenthesis
                var isNotExpression = token.type === TOKEN.NOT;
                var readAhead = (isNotExpression ? 2 : 1);
                var j = i + readAhead;
                var parensBalance = 1;
                for(; j < tokens.length; j++) {
                    var ptoken = tokens[j];
                    if (ptoken.type === TOKEN.OPEN) parensBalance++;
                    else if (ptoken.type === TOKEN.CLOSE) parensBalance--;
                    if (parensBalance === 0) break;
                }
                if (parensBalance !== 0) throw "Expected )";
                var ptokens = tokens.slice(i + readAhead, j);
                mlparse(ptokens).forEach(item => args.push(item));
                if (isNotExpression) args.push(NotExpression());
                var curOp = ops.shift(); //maybe ops.pop()?
                if (curOp) args.push(curOp);
                i = j;
                break;
            case TOKEN.CLOSE:
                throw "Unexpected token )";
            case TOKEN.AND:
                var andexp = AndExpression();
                ops.push(andexp);
                break;
            case TOKEN.OR:
                var orexp = OrExpression();
                ops.push(orexp);
                break;
            case TOKEN.NAME:
            case TOKEN.FALSE:
            case TOKEN.TRUE:
                var name;
                if (token.type === TOKEN.NAME) {
                    name = SettingExpression(token.value);
                } else {
                    name = LiteralExpression(token.value);
                }
                args.push(name);
                var curOp = ops.shift(); //maybe ops.pop()?
                if (curOp) args.push(curOp);
                break;
            default:
                throw "Unknown token " + token.type;
        }
    }

    //Add any trailing operators
    ops.forEach(item => args.push(item));
    return args;
}

/**
 * Transform array of ordered expressions into an actual expression
 * @param {Expression[]} expressions 
 * @returns {Expression} expression tree
 */
function mltree(expressions) {
    var executionLimit = 1000;
    var stack = [];

    while (expressions.length > 0) {
        var exp = expressions.shift();
        switch (exp.arity) {
            case 1:
                exp.left = stack.pop();
                break;
            case 2: 
                exp.right = stack.pop();
                exp.left = stack.pop();
                break;
        }
        stack.push(exp);
        if (--executionLimit === 0) throw "Execution limit reached, too many operations";
    }

    return stack[0];
}

/**
 * Evaluate an expression
 * @param {Expression} expression 
 * @returns {boolean}
 */
function mleval(expression, environment) {
    var functionEnvironment = typeof(environment) === "function";
    var expressionParse = typeof(expression) === "string";

    if (expressionParse) {
        expression = mltree(mlparse(mllex(expression)));
    }

    /**
     * Evaluate an expression
     * @param {Expression} expTree 
     * @returns {boolean}
     */
    function EvaluateExpressionTree(expTree) {
        switch (expTree.expression) {
            case "LITERAL": 
                return expTree.value;
            case "SETTING":
                if (functionEnvironment) {
                    return environment(expTree.value);
                }
                else {
                    return environment[expTree.value];
                }
            case "AND":
                var left = EvaluateExpressionTree(expTree.left);
                return left && EvaluateExpressionTree(expTree.right);
            case "OR":
                var left = EvaluateExpressionTree(expTree.left);
                return left || EvaluateExpressionTree(expTree.right);
            case "NOT":
                return !EvaluateExpressionTree(expTree.left);
            default:
                throw "Unknown expression type " + expTree.expression;
        }
    }

    return EvaluateExpressionTree(expression);
}