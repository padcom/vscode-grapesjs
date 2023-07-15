/* eslint-disable no-use-before-define */
/* eslint-disable no-inner-declarations */
/* eslint-disable max-lines-per-function */
import * as vscode from 'vscode'

function getUriForWebviewWithExtension(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
  folder: string, ...location: string[]
) {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, folder, ...location))
}

function getHtmlForWebview(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
) {
  const getUri = getUriForWebviewWithExtension.bind(null, extensionUri, webview, 'media')

  const stylesGrapes = getUri('grapes.min.css')
  const stylesMain = getUri('main.css')
  const scriptGrapes = getUri('grapes.min.js')
  const scriptGrapesBlocksCustomCode = getUri('grapesjs-custom-code.min.js')
  const scriptGrapesBlocksBasics = getUri('grapesjs-blocks-basic.min.js')
  const scriptGrapesBlocksFlexbox = getUri('grapesjs-blocks-flexbox.min.js')
  const scriptGrapesNavbar = getUri('grapesjs-navbar.min.js')
  const scriptGrapesTooltip = getUri('grapesjs-tooltip.min.js')
  const scriptGrapesStyleGradient = getUri('grapesjs-styles-gradient.min.js')
  const scriptGrapesPluginForms = getUri('grapesjs-plugin-forms.min.js')
  const scriptGrapesPresetWebpage = getUri('grapesjs-preset-webpage.min.js')

  // Use a nonce to only allow specific scripts to be run
  const nonce = getNonce()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <!--
    Use a content security policy to only allow loading images from https or from our extension directory,
    and only allow scripts that have a specific nonce.
  -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${webview.cspSource} https://cdnjs.cloudflare.com 'self' 'unsafe-inline';
    font-src ${webview.cspSource} https://cdnjs.cloudflare.com;
    img-src ${webview.cspSource} https: data:*;
    script-src 'nonce-${nonce}';
  ">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <link nonce="${nonce}" href="${stylesGrapes}" rel="stylesheet">
  <link nonce="${nonce}" href="${stylesMain}" rel="stylesheet">

  <title>GrapesJS</title>
</head>
<body style="margin: 0; padding: 0">
  <div id="gjs">
    <h1>Hello, world!</h1>
  </div>
  <script nonce="${nonce}" src="${scriptGrapes}"></script>
  <script nonce="${nonce}" src="${scriptGrapesPresetWebpage}"></script>
  <script nonce="${nonce}" src="${scriptGrapesBlocksCustomCode}"></script>
  <script nonce="${nonce}" src="${scriptGrapesBlocksBasics}"></script>
  <script nonce="${nonce}" src="${scriptGrapesBlocksFlexbox}"></script>
  <script nonce="${nonce}" src="${scriptGrapesNavbar}"></script>
  <script nonce="${nonce}" src="${scriptGrapesTooltip}"></script>
  <script nonce="${nonce}" src="${scriptGrapesPluginForms}"></script>
  <script nonce="${nonce}" src="${scriptGrapesStyleGradient}"></script>

  <script nonce="${nonce}">
    window.editor = grapesjs.init({
      container: '#gjs',
      fromElement: true,
      storageManager: false,
      height: '100vh',
      plugins: [
        'grapesjs-preset-webpage',
        'grapesjs-custom-code',
        'gjs-blocks-basic',
        'grapesjs-blocks-flexbox',
        'grapesjs-navbar',
        'grapesjs-tooltip',
        'grapesjs-plugin-forms',
        'grapesjs-style-gradient',
      ]
    })
  </script>
</body>
</html>`
}

function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

function getCurrentColumnOrDefault(_default = vscode.ViewColumn.One) {
  return vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn || _default
    : _default
}

function createWebView(extensionUri: vscode.Uri, column: vscode.ViewColumn) {
  return vscode.window.createWebviewPanel(
    'grapesjs',
    'GrapesJS',
    column,
    {
      // Enable javascript in the webview
      enableScripts: true,
      // And restrict the webview to only loading content from our extension's `media` directory.
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    },
  )
}

let grapes: vscode.WebviewPanel | null = null

function openGrapesPanelCommand(context: vscode.ExtensionContext) {
  const column = getCurrentColumnOrDefault(vscode.ViewColumn.One)
  if (grapes) {
    grapes.reveal(column)
  } else {
    const disposables: vscode.Disposable[] = []

    function dispose() {
      grapes?.dispose()
      grapes = null

      // remove all disposable items
      for (const item of disposables) item.dispose()
      // clear the list of items to dispose
      disposables.splice(0, disposables.length)
    }

    function update() {
      if (grapes?.visible) {
        grapes.webview.html = getHtmlForWebview(context.extensionUri, grapes.webview)
      }
    }

    function onMessage(message: any) {
      console.log('message:', message)

      switch (message.command) {
        case 'alert':
          vscode.window.showErrorMessage(message.text)
      }
    }

    grapes = createWebView(context.extensionUri, column)
    grapes.onDidDispose(dispose, null, disposables)
    grapes.onDidChangeViewState(update, null, disposables)
    grapes.webview.onDidReceiveMessage(onMessage, null, disposables)

    // Render the webview for the first time
    update()
  }
}

/**
 * This function is called by VSCode when the extension is activated
 * for the first time. It should register everything it needs, like
 * commands, subscriptions and so on.
 *
 * @param context context to work with
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('grapesjs.open', () => openGrapesPanelCommand(context)),
  )
}
