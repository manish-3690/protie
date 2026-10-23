const { spawn } = require('child_process');

console.log('Testing REA MCP Server startup on Windows...');

const proc = spawn('cmd.exe', ['/d', '/c', 'npx', '-y', 'rea-agents@6.7.0', 'mcp'], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

let buffer = '';

proc.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  // Check if buffer contains JSON-RPC response
  const lines = buffer.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line.trim());
      if (msg.id === 1) {
        console.log('✓ Successfully received initialize response from REA MCP server:');
        console.log('  Server Name:', msg.result.serverInfo?.name);
        console.log('  Server Version:', msg.result.serverInfo?.version);
        console.log('  Protocol Version:', msg.result.protocolVersion);
        
        // Now send tools/list
        const toolsReq = JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }) + '\n';
        proc.stdin.write(toolsReq);
      } else if (msg.id === 2) {
        const tools = msg.result?.tools || [];
        console.log(`✓ tools/list answered successfully with ${tools.length} available tools!`);
        console.log('  Sample tools:', tools.slice(0, 8).map(t => t.name).join(', '));
        
        // Cleanly exit
        proc.kill();
        process.exit(0);
      }
    } catch {
      // not a full json line yet
    }
  }
});

// Send initialize request
const initReq = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'antigravity-verifier',
      version: '1.0.0',
    },
  },
}) + '\n';

proc.stdin.write(initReq);

setTimeout(() => {
  console.error('Timed out waiting for REA MCP server response');
  proc.kill();
  process.exit(1);
}, 25000);
