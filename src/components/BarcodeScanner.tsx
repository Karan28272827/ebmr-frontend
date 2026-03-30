import React, { useEffect, useRef, useState } from 'react';
import { Modal, Input, Button, Space, Alert, Typography } from 'antd';
import { ScanOutlined, SearchOutlined } from '@ant-design/icons';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScanned }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerId = 'barcode-scanner-container';

  useEffect(() => {
    if (!open) {
      stopScanner();
      setManualCode('');
      setScannerError(null);
      return;
    }
  }, [open]);

  const startScanner = async () => {
    setScannerError(null);
    setScanning(true);
    try {
      // Dynamically import to avoid SSR issues
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      const scanner = new Html5QrcodeScanner(
        containerId,
        { fps: 10, qrbox: { width: 250, height: 150 }, supportedScanTypes: [0, 1] }, // 0=camera, 1=file
        false,
      );
      scannerRef.current = scanner;
      scanner.render(
        (decodedText: string) => {
          stopScanner();
          onScanned(decodedText.trim());
        },
        () => { /* ignore decode errors */ },
      );
    } catch (e: any) {
      setScannerError('Camera not available. Use manual entry below.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScanned(code);
  };

  return (
    <Modal
      title={<Space><ScanOutlined /> Scan Barcode</Space>}
      open={open}
      onCancel={() => { stopScanner(); onClose(); }}
      footer={null}
      width={420}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {!scanning ? (
          <Button icon={<ScanOutlined />} type="primary" block onClick={startScanner}>
            Start Camera Scanner
          </Button>
        ) : (
          <Button block onClick={stopScanner}>Stop Scanner</Button>
        )}

        <div id={containerId} style={{ width: '100%' }} />

        {scannerError && <Alert message={scannerError} type="warning" showIcon />}

        <Typography.Text type="secondary">Or enter batch/material code manually:</Typography.Text>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="e.g. BATCH-2024-001 or RM-PARA-API"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onPressEnter={handleManual}
          />
          <Button icon={<SearchOutlined />} type="primary" onClick={handleManual}>
            Find
          </Button>
        </Space.Compact>
      </Space>
    </Modal>
  );
}
