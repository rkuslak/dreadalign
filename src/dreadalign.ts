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
 * Iterates through a passed array of strings, splitting them on their
 * "delimiter", and returns a new array of aligned strings.
 * @param padding The "depth", in spaces, of indentation for the line
 * @param delimiter Character or string to use to split lines for alignment
 * @param text Array of strings to split and align
 * @returns Array of "aligned" text
 */
function alignText(padding: number, delimiter: string, text: string[]): string[] {
    // TODO: This is ugly. Too much logic in one method; split this up!
    // Takes an array of strings and splits them via the delimiter string.
    // each strimg will have the "padding" value added to it prior to return.

    // TODO: Handle this as a configuration option:
    // String that is used to "join" aligned segments of the line:
    const alignmentSeperator: string = " " + delimiter + " ";

    const formatedStrings: string[] = [];
    const linesSplit: string[][] = [];
    const rowSizes: number[] = [];

    const paddingText: string = text[0].match(/^\s*/)[0];
    padding = padding + (paddingText.length);

    // Create an array of strings split by the delimiter
    text.forEach((line: string) => {
        const lineParts: string[] = line.trim().split(delimiter);
        if (lineParts.length > 1) {
            lineParts.forEach((linePart: string, linePartIndex: number) => {
                // Place size of current linePart in hash map as size if larger
                // than current, or if there is no definition for this
                // linePartIndex:
                if (!rowSizes[linePartIndex]) { rowSizes[linePartIndex] = linePart.length; }

                if (rowSizes[linePartIndex] < linePart.length) { rowSizes[linePartIndex] = linePart.length; }
            });
        }
        linesSplit.push(lineParts);
    });

    // Use the string parts to for a full string and push it to our results
    // array:
    linesSplit.forEach((line: string[], lineIndex: number) => {
        // Retains the newly-formated string that combines each line part
        // with the delimiter:
        let formatedString: string = "";

        // Do not push in on first line: use selection start as delimiter
        if (lineIndex > 0) {
            formatedString += " ".repeat(padding);
        } else {
            formatedString += paddingText;
        }

        const linePartsCount = line.length - 1;
        line.forEach((linePart: string, linePartIndex: number) => {
            linePart = linePart.trim();

            // TODO: Configuration option for padding delimiter
            // if (linePartIndex > 0) { formatedString += " " + delimiter + " "; }
            if (linePartIndex > 0) {
                formatedString += alignmentSeperator;
            }
            formatedString += linePart;

            // Only append space if remaining elements to add to line:
            if (linePartIndex < linePartsCount) {
                formatedString += " ".repeat(rowSizes[linePartIndex] -  linePart.length);
            }
        });
        formatedStrings.push(formatedString);
    });

    return formatedStrings;
}

/**
 * Attempts to sort and align strings based on the first line's leading white space and
 * delimiter string, and then reassemble them aligned based on indent level and using
 * the passed replacement seperator or 'delimiter'.
 * @param delimiter Delimiting character to split the string on
 * @param replacementDelimiter String to replace the delimiter with in aligned strings
 */
function alignCurrentSelection(delimiter: string) {
    // TODO: Regex
    // TODO: multiple selections
    // TODO: Handle multiple indents as seperate sections
    interface IEditQueue {
        range: vscode.Range;
        fixedText: string;
    }
    const editsQueue: IEditQueue[] = new Array<IEditQueue>();

    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;

    const rangeStart = selection.start;
    const rangeEnd = selection.end;
    const range = new vscode.Range(rangeStart, rangeEnd);

    const text = editor.document.getText(range).split("\n");
    const padding = rangeStart.character;

    const fixedText = alignText(padding, delimiter, text);

    editsQueue.push({
        fixedText: fixedText.join("\n"),
        range,
    });

    // Replace selected text with aligned text:
    editsQueue.forEach( (queueItem) => {
        // TODO: Use current documents EOL preference?
        // TODO: Currently only cascades first edit.
        editor.edit( (builder: vscode.TextEditorEdit) => {
            builder.replace(queueItem.range, queueItem.fixedText);
        });
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
            .then((delimiter) => {
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
