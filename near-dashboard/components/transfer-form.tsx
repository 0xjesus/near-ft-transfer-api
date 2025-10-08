'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Send, Loader2, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TransferResponse } from '@/lib/types';

interface Transfer {
  receiverId: string;
  amount: string;
  memo: string;
}

interface TransferFormProps {
  onTransferCreated?: (transfer: TransferResponse) => void;
}

export function TransferForm({ onTransferCreated }: TransferFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [singleTransfer, setSingleTransfer] = useState<Transfer>({
    receiverId: 'nearquantum.near',
    amount: '1000000000000000000',
    memo: 'Test transfer from dashboard',
  });
  const [batchTransfers, setBatchTransfers] = useState<Transfer[]>([
    { receiverId: 'nearquantum.near', amount: '1000000000000000000', memo: 'Test batch transfer 1' },
  ]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!singleTransfer.receiverId || !singleTransfer.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.createTransfer({
        receiverId: singleTransfer.receiverId,
        amount: singleTransfer.amount,
        memo: singleTransfer.memo || undefined,
      });

      toast.success(`Transfer created successfully!`, {
        description: `ID: ${response.id}`,
      });

      onTransferCreated?.(response);
      setSingleTransfer({
        receiverId: 'nearquantum.near',
        amount: '1000000000000000000',
        memo: 'Test transfer from dashboard'
      });
    } catch (error) {
      toast.error('Failed to create transfer', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validTransfers = batchTransfers.filter(
      (t) => t.receiverId && t.amount
    );

    if (validTransfers.length === 0) {
      toast.error('Please add at least one valid transfer');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.createBatchTransfer({
        transfers: validTransfers.map((t) => ({
          receiverId: t.receiverId,
          amount: t.amount,
          memo: t.memo || undefined,
        })),
      });

      toast.success(`Batch transfer created successfully!`, {
        description: `${response.length} transfers created`,
      });

      response.forEach((transfer) => {
        onTransferCreated?.(transfer);
      });

      setBatchTransfers([{
        receiverId: 'nearquantum.near',
        amount: '1000000000000000000',
        memo: 'Test batch transfer 1'
      }]);
    } catch (error) {
      toast.error('Failed to create batch transfer', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBatchTransfer = () => {
    const nextIndex = batchTransfers.length + 1;
    setBatchTransfers([
      ...batchTransfers,
      {
        receiverId: 'nearquantum.near',
        amount: '1000000000000000000',
        memo: `Test batch transfer ${nextIndex}`
      },
    ]);
  };

  const removeBatchTransfer = (index: number) => {
    setBatchTransfers(batchTransfers.filter((_, i) => i !== index));
  };

  const updateBatchTransfer = (
    index: number,
    field: keyof Transfer,
    value: string
  ) => {
    const updated = [...batchTransfers];
    updated[index][field] = value;
    setBatchTransfers(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="gradient-text">Test Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Transfer</TabsTrigger>
              <TabsTrigger value="batch">Batch Transfer</TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Receiver ID *</label>
                  <Input
                    placeholder="alice.near"
                    value={singleTransfer.receiverId}
                    onChange={(e) =>
                      setSingleTransfer({
                        ...singleTransfer,
                        receiverId: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                    className="glass-card border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount *</label>
                  <Input
                    placeholder="1.5"
                    type="text"
                    value={singleTransfer.amount}
                    onChange={(e) =>
                      setSingleTransfer({
                        ...singleTransfer,
                        amount: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                    className="glass-card border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Memo (Optional)</label>
                  <Input
                    placeholder="Payment for services"
                    value={singleTransfer.memo}
                    onChange={(e) =>
                      setSingleTransfer({
                        ...singleTransfer,
                        memo: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                    className="glass-card border-white/10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Transfer...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Create Transfer
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="batch">
              <form onSubmit={handleBatchSubmit} className="space-y-4">
                <AnimatePresence>
                  {batchTransfers.map((transfer, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 p-4 rounded-lg border border-white/10 bg-white/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Transfer {index + 1}
                        </span>
                        {batchTransfers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBatchTransfer(index)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <Input
                        placeholder="Receiver ID"
                        value={transfer.receiverId}
                        onChange={(e) =>
                          updateBatchTransfer(index, 'receiverId', e.target.value)
                        }
                        disabled={isSubmitting}
                        className="glass-card border-white/10"
                      />

                      <Input
                        placeholder="Amount"
                        value={transfer.amount}
                        onChange={(e) =>
                          updateBatchTransfer(index, 'amount', e.target.value)
                        }
                        disabled={isSubmitting}
                        className="glass-card border-white/10"
                      />

                      <Input
                        placeholder="Memo (optional)"
                        value={transfer.memo}
                        onChange={(e) =>
                          updateBatchTransfer(index, 'memo', e.target.value)
                        }
                        disabled={isSubmitting}
                        className="glass-card border-white/10"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addBatchTransfer}
                  disabled={isSubmitting}
                  className="w-full border-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transfer
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Batch...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Create Batch Transfer
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
