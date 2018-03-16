import * as vscode from 'vscode';

function alignText(padding:number, delimiter:string, text:Array<string>):string[] {
    // Takes an array of strings and splits them via the delimiter string.
    // each strimg will have the "padding" value added to it prior to return.

    let formatedStrings:string[] = [];
    let splitStrings:Array<string[]> = new Array<string[]>();
    let rowSizes:Array<number> = new Array<number>();

    // Create an array of strings split by the delimiter
    for(let x = 0; x < text.length; x++) {
        let line = text[x].trim();
        let lineParts = line.split(delimiter);
        if (lineParts.length > 1) {
            lineParts.forEach((linePart:string, index:number) => {
                if (!rowSizes[index]) { rowSizes[index] = linePart.length; }

                if (rowSizes[index] < linePart.length) {
                    rowSizes[index] = linePart.length;
                }
            })
        }
        splitStrings.push(lineParts);
    }

    // Use the string parts to for a full string and push it to our results
    // array:
    splitStrings.forEach((lineParts:string[]) => {
        let formatedString:string = ' '.repeat(padding);
        let linePartsCount = lineParts.length - 1;
        lineParts.forEach((linePart:string, index:number) => {
            linePart = linePart.trim();

            // TODO: Configuration option for padding delimiter
            if (index > 0) { formatedString += ' ' + delimiter + ' '; }
            formatedString += linePart

            // Only append space if remaining elements to add to line:
            if (index < linePartsCount)
                formatedString += ' '.repeat(rowSizes[index] -  linePart.length);
        });
        formatedStrings.push(formatedString);
    });

    return formatedStrings;
}

function alignCurrentSelection(delimiter:string) {
    // TODO: Regex
    // TODO: multiple selections
    let editor = vscode.window.activeTextEditor;
    let selected:(vscode.Selection) = editor.selection;
    let lineStart = selected.start.line
    let lineStop = selected.end.line


    let text:Array<string> = new Array<string>();
    for (let x = lineStart; x <= lineStop; x++) {
        let line = editor.document.lineAt(x).text
        text.push(line);
    }
    // if we are at the first character of a new line, ignore it:
    if (selected.end.character == 0) {
        text.pop();
        text.push('\n');
    }

    let fixedText = alignText(selected.start.character, delimiter, text);
    let range = new vscode.Range(selected.start, selected.end);

    // Replace selected text with aligned text:
    editor.edit( (builder:vscode.TextEditorEdit) => {
        // TODO: Use current documents EOL preference?
        builder.replace(range, fixedText.join('\n'))
    })
}

export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    // let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
    //     // The code you place here will be executed every time your command is executed

    //     // Display a message box to the user
    //     vscode.window.showInformationMessage('Hello World!');
    // });
    let disposable = vscode.commands.registerCommand('extension.loadDreadAlign', () => {
        let editor = vscode.window.activeTextEditor;
        if (! editor || editor.selection.isEmpty) {
            console.log(`No editor or selection found, returning`);
            return;
        }
        let opts:vscode.InputBoxOptions = {
            prompt:'Value to split strings on',
        };
        
        vscode.window.showInputBox(opts)
            .then((delimiter) => {
                if (!delimiter) {
                    console.log('No delimiter, returning...');
                    return;
                }
                alignCurrentSelection(delimiter);
            });
        });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}