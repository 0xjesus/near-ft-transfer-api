'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Book, Code, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const API_BASE_URL = 'https://near-api.codexaeternum.tech';

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-t-lg border border-b-0">
        <span className="text-xs font-mono text-muted-foreground uppercase">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              <span className="text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <pre className="bg-card border rounded-b-lg p-4 overflow-x-auto text-sm">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
};

export function ApiDocumentation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <CardTitle>API Documentation</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Complete guide to consuming the NEAR FT Transfer API endpoints
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Base URL */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Base URL</span>
              </div>
              <code className="text-sm font-mono">{API_BASE_URL}</code>
            </div>

            {/* Endpoints */}
            <div className="space-y-6">
              {/* Health Check */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    GET
                  </Badge>
                  <h3 className="font-semibold">/health</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check API health status and uptime
                </p>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-4">
                    <CodeBlock
                      language="bash"
                      code={`curl -X GET ${API_BASE_URL}/health`}
                    />
                  </TabsContent>
                  <TabsContent value="js" className="mt-4">
                    <CodeBlock
                      language="javascript"
                      code={`const response = await fetch('${API_BASE_URL}/health');
const data = await response.json();
console.log(data);`}
                    />
                  </TabsContent>
                  <TabsContent value="response" className="mt-4">
                    <CodeBlock
                      language="json"
                      code={`{
  "status": "ok",
  "timestamp": "2025-10-08T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}`}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    GET
                  </Badge>
                  <h3 className="font-semibold">/stats</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get service statistics and performance metrics
                </p>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-4">
                    <CodeBlock
                      language="bash"
                      code={`curl -X GET ${API_BASE_URL}/stats`}
                    />
                  </TabsContent>
                  <TabsContent value="js" className="mt-4">
                    <CodeBlock
                      language="javascript"
                      code={`const response = await fetch('${API_BASE_URL}/stats');
const data = await response.json();
console.log(data);`}
                    />
                  </TabsContent>
                  <TabsContent value="response" className="mt-4">
                    <CodeBlock
                      language="json"
                      code={`{
  "stats": {
    "totalTransfers": 1234,
    "successRate": 99.5,
    "throughput": 12.5,
    "queueSize": 5
  },
  "nonceManager": {
    "activeNonces": 10,
    "availableNonces": 90,
    "lockedNonces": 0
  }
}`}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Transfer */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    POST
                  </Badge>
                  <h3 className="font-semibold">/transfer</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Queue a single token transfer
                </p>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-4">
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST ${API_BASE_URL}/transfer \\
  -H "Content-Type: application/json" \\
  -d '{
    "receiver_id": "recipient.near",
    "amount": "1000000000000000000000000",
    "memo": "Payment for services"
  }'`}
                    />
                  </TabsContent>
                  <TabsContent value="js" className="mt-4">
                    <CodeBlock
                      language="javascript"
                      code={`const response = await fetch('${API_BASE_URL}/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    receiver_id: 'recipient.near',
    amount: '1000000000000000000000000',
    memo: 'Payment for services'
  })
});

const data = await response.json();
console.log(data);`}
                    />
                  </TabsContent>
                  <TabsContent value="response" className="mt-4">
                    <CodeBlock
                      language="json"
                      code={`{
  "transfer_id": "abc123xyz",
  "status": "queued",
  "receiver_id": "recipient.near",
  "amount": "1000000000000000000000000",
  "memo": "Payment for services",
  "queued_at": "2025-10-08T12:00:00.000Z"
}`}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Get Transfer Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    GET
                  </Badge>
                  <h3 className="font-semibold">/transfer/:id</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get the status of a specific transfer by ID
                </p>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-4">
                    <CodeBlock
                      language="bash"
                      code={`curl -X GET ${API_BASE_URL}/transfer/abc123xyz`}
                    />
                  </TabsContent>
                  <TabsContent value="js" className="mt-4">
                    <CodeBlock
                      language="javascript"
                      code={`const transferId = 'abc123xyz';
const response = await fetch(\`${API_BASE_URL}/transfer/\${transferId}\`);
const data = await response.json();
console.log(data);`}
                    />
                  </TabsContent>
                  <TabsContent value="response" className="mt-4">
                    <CodeBlock
                      language="json"
                      code={`{
  "transfer_id": "abc123xyz",
  "status": "completed",
  "receiver_id": "recipient.near",
  "amount": "1000000000000000000000000",
  "memo": "Payment for services",
  "transaction_hash": "FXMTfz...",
  "queued_at": "2025-10-08T12:00:00.000Z",
  "completed_at": "2025-10-08T12:00:05.000Z"
}`}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Batch Transfer */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    POST
                  </Badge>
                  <h3 className="font-semibold">/transfer/batch</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Queue multiple token transfers in a single request
                </p>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-4">
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST ${API_BASE_URL}/transfer/batch \\
  -H "Content-Type: application/json" \\
  -d '{
    "transfers": [
      {
        "receiver_id": "user1.near",
        "amount": "1000000000000000000000000",
        "memo": "Payment 1"
      },
      {
        "receiver_id": "user2.near",
        "amount": "2000000000000000000000000",
        "memo": "Payment 2"
      }
    ]
  }'`}
                    />
                  </TabsContent>
                  <TabsContent value="js" className="mt-4">
                    <CodeBlock
                      language="javascript"
                      code={`const response = await fetch('${API_BASE_URL}/transfer/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    transfers: [
      {
        receiver_id: 'user1.near',
        amount: '1000000000000000000000000',
        memo: 'Payment 1'
      },
      {
        receiver_id: 'user2.near',
        amount: '2000000000000000000000000',
        memo: 'Payment 2'
      }
    ]
  })
});

const data = await response.json();
console.log(data);`}
                    />
                  </TabsContent>
                  <TabsContent value="response" className="mt-4">
                    <CodeBlock
                      language="json"
                      code={`{
  "count": 2,
  "transfers": [
    {
      "transfer_id": "abc123",
      "status": "queued",
      "receiver_id": "user1.near",
      "amount": "1000000000000000000000000",
      "memo": "Payment 1"
    },
    {
      "transfer_id": "def456",
      "status": "queued",
      "receiver_id": "user2.near",
      "amount": "2000000000000000000000000",
      "memo": "Payment 2"
    }
  ]
}`}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Events */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    GET
                  </Badge>
                  <h3 className="font-semibold">/events</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fetch recent API activity and event logs
                </p>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-4">
                    <CodeBlock
                      language="bash"
                      code={`curl -X GET ${API_BASE_URL}/events`}
                    />
                  </TabsContent>
                  <TabsContent value="js" className="mt-4">
                    <CodeBlock
                      language="javascript"
                      code={`const response = await fetch('${API_BASE_URL}/events');
const data = await response.json();
console.log(data);`}
                    />
                  </TabsContent>
                  <TabsContent value="response" className="mt-4">
                    <CodeBlock
                      language="json"
                      code={`{
  "events": [
    {
      "timestamp": "2025-10-08T12:00:00.000Z",
      "method": "POST",
      "path": "/transfer",
      "status": 200,
      "message": "Transfer queued"
    }
  ]
}`}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
              <h4 className="font-semibold text-sm">Important Notes</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>All amounts must be specified in yoctoNEAR (1 NEAR = 10²⁴ yoctoNEAR)</li>
                <li>The <code className="text-xs bg-muted px-1 py-0.5 rounded">receiver_id</code> must be a valid NEAR account</li>
                <li>Transfer IDs are generated automatically and returned in the response</li>
                <li>Use the transfer ID to track the status of your transaction</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
