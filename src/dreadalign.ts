// Disable no console so we can have debugging output:
/* tslint:disable:no-console */

/*
 * THE GRAND LIST OF TODOS:
 *
 * Needs configuration options
 * Need to handle selection starting in the middle of the line more elegantly
 *  (currently just starts splitting at start of selection)
 * Similar for end of select (align entire line?)
 * Code clean up - too much logic concentrated in a few large functions
 * Better automation of publishing process?
 * Comments. Come on, you're better than this
 * Handling of where to "start" lines is so horrible wrong:\
 *  Fix it to base "start" of line on current "indent" level
 *  Retain indentation (if spaces use spaces, if tabs shake head at how wrong they are)
 */

import * as vscode from "vscode";

/**
 * Splits a collection of strings on the passed delimiter, and recombines them
 * into lines of text that are aligned on said delimiter.
 * @param padding String of characters to "pad" the start of each line with.
 * @param delimiter Delimiter string to split each line of text on.
 * @param text Array of strings containing the full text to split.
 * @param prepend String of text to append prior to delimiter when recombining.
 * @param postpend String of text to append after the delimiter when combining.
 */
function splitLineOnDelimiter(
        padding: string,
        delimiter: string,
        text: string[],
        prepend: string | null,
        postpend: string | null): string[] {
    // TODO: Currently assumes every line has delimiter; need to parse out which don't
    // and ignore for line size logic and formatting

    // Max size of each line segment:
    const lineSizes: number[] = [];

    // Lines which do not contain the delimiter and as such are "ignored"
    const ignoredLines: number[] = [];

    // Collection of lines trimmed and split on the delimiter:
    const splitLines: string[][] = [];

    // Collection of text aligned and collated:
    const finalText: string[] = [];

    text.forEach((line: string, idx: number) => {
        const splitLine = line.trim().split(delimiter);
        if (splitLine.length === 1) { ignoredLines.push(idx); }
        splitLines.push(splitLine);
    });

    // Find max length for each line part:
    splitLines.forEach((lineParts: string[]) => {
        lineParts.forEach((linePart: string, idx: number) => {
            if (!lineSizes[idx]) { lineSizes[idx] = linePart.length; }
            if (linePart.length > lineSizes[idx]) { lineSizes[idx] = linePart.length; }
        });
    });

    // Combine split lines with delimiter:
    splitLines.forEach((lineParts: string[], idx: number) => {
        let line: string = padding;

        if (ignoredLines.indexOf(idx, 0)) {
            line += padding + lineParts[0];
        } else {
            lineParts.forEach((linePart: string, splitIdx: number) => {
                // Add line and padding if not the end of the line:
                line += linePart;
                if (splitIdx !== 0) {
                    line += (prepend || "") + delimiter;
                }

                if (splitIdx < linePart.length) {
                    line += " ".repeat(lineSizes[splitIdx] - linePart.length);
                    line += postpend || "";
                }
            });
        }

        finalText.push(line);
    });

    return finalText;
}

/**
 * Returns a range, starting at the start of the first line and ending on the
 * last character of the last line, for a selection object.
 * @param selection A VSCode.Selection object for the selection to pull data from.
 */
function getRangeFromSelection(selection: vscode.Selection): vscode.Range {
    const lineStart: vscode.Position = selection.start;
    const lineEnd: vscode.Position = selection.end;

    // Ensure selection is more that 1 line:
    if (lineEnd.isBeforeOrEqual(lineStart)) {
        console.log("lineStart prior to lineEnd; failing...");
        return null;
    }

    const editor = vscode.window.activeTextEditor;
    const endLine: vscode.TextLine = editor.document.lineAt(lineEnd.line);

    return new vscode.Range(lineStart.line, 0, lineEnd.line, endLine.range.end.character);
}

/**
 * Returns a range of text between 2 Position objects in the current editor
 * window, pulling the full first and last line.
 * @param selection: A VSCode Selection object for the range of lines desired.
 * @returns array of strings representing the text in the selection area.
 */
function getEditorText(selection: vscode.Selection): string[] {
    const editor = vscode.window.activeTextEditor;
    const range: vscode.Range = getRangeFromSelection(selection);

    return editor.document.getText(range).split("\n");
}

/**
 * Attempts to sort and align strings based on the first line's leading white space and
 * delimiter string, and then reassemble them aligned based on indent level and using
 * the passed replacement seperator or 'delimiter'.
 * @param delimiter Delimiting character to split the string on.
 * @param replacementDelimiter String to replace the delimiter with in aligned strings.
 */
function alignCurrentSelection(delimiter: string) {
    // TODO: Regexs?

    const editor = vscode.window.activeTextEditor;

    // Since we are not adding lines, just editing, grabbing the line numbers
    // of these lines should be fine. - Ozymandias, to TypeScript, 2018:
    // TODO: Explore iterating over this to handle multi-selections
    // const selectedRanges: vscode.Range[] = [];
    // editor.selections.forEach( (s: vscode.Selection) => {
    //     selectedRanges.push(getRangeFromSelection(s));
    // });
    // console.log(selectedRanges);

    const selection = editor.selection;
    const text = getEditorText(selection);

    // The indentation "padding" used on the current line:
    let padding: string = text[0].match(/^\s*/)[0];

    // An array of strings at the same indentation level:
    let paddedText: string[] = [];

    // The singlar string containing the final end result:
    let fixedText: string = "";

    let line: number = 0;
    while (line < text.length) {
        const matches: string[] = text[line].match(/^\s*/);
        const currentLinePadding: string = matches[0] || "";
        // console.log("Matches:", matches[0]);

        if (currentLinePadding !== padding) {
            console.log(padding, padding.length);
            // fixedText += alignText(padding.length, delimiter, paddedText).join("\n") + "\n";
            fixedText += splitLineOnDelimiter(padding, delimiter, paddedText, null, null).join("\n") + "\n";
            paddedText = [];
            padding = currentLinePadding;
        }

        paddedText.push(text[line]);
        line++;
    }
    // fixedText += alignText(padding.length, delimiter, paddedText).join("\n");
    fixedText += splitLineOnDelimiter(padding, delimiter, paddedText, null, null).join("\n");

    editor.edit( (builder: vscode.TextEditorEdit) => {
        builder.replace(getRangeFromSelection(selection), fixedText);
    });
}

export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    // let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
    //     // The code you place here will be executed every time your command is executed
    // });
    const disposable = vscode.commands.registerCommand("extension.loadDreadAlign", () => {
        const editor = vscode.window.activeTextEditor;
        if (! editor || editor.selection.isEmpty || editor.selection.isSingleLine ) {
            console.log(`No editor or selection found, returning`);
            return;
        }
        const opts: vscode.InputBoxOptions = {
            prompt: "Value to split strings on",
        };

        vscode.window.showInputBox(opts)
            .then((delimiter: string) => {
                if (!delimiter) {
                    console.log("No delimiter, returning...");
                    return;
                }
                alignCurrentSelection(delimiter);
            });
        });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
    return;
}
