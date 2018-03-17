import * as vscode from 'vscode';

function alignText(padding:number, delimiter:string, text:Array<string>):string[] {
    // Takes an array of strings and splits them via the delimiter string.
    // each strimg will have the "padding" value added to it prior to return.

    let formatedStrings:string[] = [];
    let linesSplit:Array<string[]> = new Array<string[]>();
    let rowSizes:Array<number> = new Array<number>();

    let paddingText = text[0].match(/^\s*/)[0];
    padding = padding + (paddingText.length);

    // Create an array of strings split by the delimiter
    // for(let x = 0; x < text.length; x++) {
    text.forEach( (line:string) => {
        line = line.trim();
        let lineParts = line.split(delimiter);
        if (lineParts.length > 1) {
            lineParts.forEach((linePart:string, linePartIndex:number) => {
                // Place size of current linePart in hash map as size if larger
                // than current, or if there is no definition for this 
                // linePartIndex:
                if (!rowSizes[linePartIndex]) {
                    rowSizes[linePartIndex] = linePart.length;
                }

                if (rowSizes[linePartIndex] < linePart.length) {
                    rowSizes[linePartIndex] = linePart.length;
                }
            })
        }
        linesSplit.push(lineParts);
    }

    // Use the string parts to for a full string and push it to our results
    // array:
    linesSplit.forEach((line:string[], lineIndex:number) => {
        let formatedString:string = ''

        // Do not push in on first line: use selection start as delimiter
        if (lineIndex > 0) {
            formatedString += ' '.repeat(padding);
        } else {
            formatedString += paddingText;
        }

        let linePartsCount = line.length - 1;
        line.forEach((linePart:string, linePartIndex:number) => {
            linePart = linePart.trim();

            // TODO: Configuration option for padding delimiter
            if (linePartIndex > 0) { formatedString += ' ' + delimiter + ' '; }
            formatedString += linePart

            // Only append space if remaining elements to add to line:
            if (linePartIndex < linePartsCount)
                formatedString += ' '.repeat(rowSizes[linePartIndex] -  linePart.length);
        });
        formatedStrings.push(formatedString);
    });

    return formatedStrings;
}

function alignCurrentSelection(delimiter:string) {
    // Grab 
    // TODO: Regex
    // TODO: multiple selections
    interface editQueue {
        range:vscode.Range,
        fixedText:string
    }
    let editsQueue:editQueue[] = new Array<editQueue>();

    let editor = vscode.window.activeTextEditor;
    let selection = editor.selection;

    // editor.selections.forEach((selection:vscode.Selection) => {
        let rangeStart = selection.start;
        let rangeEnd = selection.end;
        let range = new vscode.Range(rangeStart, rangeEnd);

        let text = editor.document.getText(range).split('\n');
        let padding = rangeStart.character
    
        let fixedText = alignText(padding, delimiter, text);
        editsQueue.push({ range:range, fixedText:fixedText.join('\n') });
    // });

    // Replace selected text with aligned text:
    editsQueue.forEach( (queueItem) => {
        // TODO: Use current documents EOL preference?
        // TODO: Currently only cascades first edit.
        editor.edit( (builder:vscode.TextEditorEdit) => {
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

    //     // Display a message box to the user
    //     vscode.window.showInformationMessage('Hello World!');
    // });
    let disposable = vscode.commands.registerCommand('extension.loadDreadAlign', () => {
        let editor = vscode.window.activeTextEditor;
        if (! editor || editor.selection.isEmpty || editor.selection.isSingleLine ) {
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