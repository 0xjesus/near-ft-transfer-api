'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TransferStatusResponse } from '@/lib/types';
import { useCopyToClipboard } from '@/lib/hooks';
import {
  Search,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TransfersTableProps {
  transfers: TransferStatusResponse[];
}

export function TransfersTable({ transfers }: TransfersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { copy, isCopied } = useCopyToClipboard();

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      const matchesSearch =
        transfer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.receiverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.transactionHash?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || transfer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transfers, searchQuery, statusFilter]);

  const handleCopy = async (text: string, label: string) => {
    const success = await copy(text);
    if (success) {
      toast.success(`${label} copied to clipboard`);
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Status', 'Receiver', 'Amount', 'Transaction Hash', 'Created At'].join(','),
      ...filteredTransfers.map((t) =>
        [
          t.id,
          t.status,
          t.receiverId,
          t.amount,
          t.transactionHash || '',
          t.createdAt,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transfers exported successfully');
  };

  const getStatusColor = (status: TransferStatusResponse['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const truncateHash = (hash: string, length: number = 8) => {
    if (!hash) return '-';
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="gradient-text">Recent Transfers</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={filteredTransfers.length === 0}
                className="border-white/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, receiver, or hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass-card border-white/10"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'pending', 'processing', 'completed', 'failed'].map(
                  (status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        'border-white/10',
                        statusFilter === status && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredTransfers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          No transfers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransfers.map((transfer, index) => (
                        <motion.tr
                          key={transfer.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-white/10 hover:bg-white/5 cursor-pointer"
                        >
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span>{truncateHash(transfer.id)}</span>
                              <button
                                onClick={() => handleCopy(transfer.id, 'ID')}
                                className="hover:text-primary transition-colors"
                              >
                                {isCopied ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusColor(transfer.status)}
                              className="font-mono text-xs"
                            >
                              {transfer.status === 'processing' && (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              )}
                              {transfer.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {transfer.receiverId}
                          </TableCell>
                          <TableCell className="font-mono">
                            {transfer.amount}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {transfer.transactionHash ? (
                              <div className="flex items-center gap-2">
                                <span>
                                  {truncateHash(transfer.transactionHash)}
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopy(
                                      transfer.transactionHash!,
                                      'Transaction hash'
                                    )
                                  }
                                  className="hover:text-primary transition-colors"
                                >
                                  {isCopied ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                                <a
                                  href={`https://explorer.near.org/transactions/${transfer.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(transfer.createdAt)}
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {filteredTransfers.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Showing {filteredTransfers.length} of {transfers.length} transfers
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
