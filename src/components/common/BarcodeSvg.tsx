import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface BarcodeSvgProps {
  value: string;
  type?: 'barcode' | 'qrcode' | 'both';
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  qrSize?: number;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  type = 'barcode',
  format = 'CODE128',
  width = 1.5,
  height = 35,
  displayValue = true,
  fontSize = 10,
  qrSize = 50,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasQrRef = useRef<HTMLCanvasElement | null>(null);

  const cleanValue = value ? String(value).trim() : '00000000';

  useEffect(() => {
    if ((type === 'barcode' || type === 'both') && svgRef.current) {
      try {
        // Fallback to CODE128 if EAN13 format doesn't match 12-13 digits
        let chosenFormat = format;
        if (chosenFormat === 'EAN13' && (!/^\d{12,13}$/.test(cleanValue))) {
          chosenFormat = 'CODE128';
        }

        JsBarcode(svgRef.current, cleanValue, {
          format: chosenFormat,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          textMargin: 1,
          font: 'monospace',
          margin: 0,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        // Retry with CODE128 fallback
        try {
          if (svgRef.current) {
            JsBarcode(svgRef.current, cleanValue, {
              format: 'CODE128',
              width: width,
              height: height,
              displayValue: displayValue,
              fontSize: fontSize,
              textMargin: 1,
              font: 'monospace',
              margin: 0,
              background: 'transparent',
              lineColor: '#000000',
            });
          }
        } catch (e) {
          console.warn('JsBarcode render error:', e);
        }
      }
    }
  }, [cleanValue, type, format, width, height, displayValue, fontSize]);

  useEffect(() => {
    if ((type === 'qrcode' || type === 'both') && canvasQrRef.current) {
      try {
        QRCode.toCanvas(canvasQrRef.current, cleanValue, {
          width: qrSize,
          margin: 0,
          color: {
            dark: '#000000',
            light: '#00000000',
          },
        });
      } catch (err) {
        console.warn('QRCode render error:', err);
      }
    }
  }, [cleanValue, type, qrSize]);

  if (type === 'qrcode') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <canvas ref={canvasQrRef} className="max-w-full h-auto" />
        {displayValue && (
          <span className="font-mono text-[9px] text-slate-800 mt-0.5 tracking-wider select-all">
            {cleanValue}
          </span>
        )}
      </div>
    );
  }

  if (type === 'both') {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <div className="flex-1 flex justify-center">
          <svg ref={svgRef} className="max-w-full h-auto" />
        </div>
        <div className="shrink-0 flex flex-col items-center">
          <canvas ref={canvasQrRef} style={{ width: `${qrSize}px`, height: `${qrSize}px` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};
