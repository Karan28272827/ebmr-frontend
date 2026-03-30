import React from 'react';
import Barcode from 'react-barcode';
import { Typography, Space } from 'antd';

interface BarcodeLabelProps {
  value: string;
  label?: string;
  width?: number;
  height?: number;
  fontSize?: number;
}

export default function BarcodeLabel({ value, label, width = 1.5, height = 50, fontSize = 12 }: BarcodeLabelProps) {
  return (
    <Space direction="vertical" align="center" size={2}>
      {label && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{label}</Typography.Text>}
      <Barcode
        value={value}
        width={width}
        height={height}
        fontSize={fontSize}
        margin={4}
        displayValue={true}
        background="transparent"
      />
    </Space>
  );
}
