'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { PrintableLanyardsPDF } from './PrintableLanyardsPDF';

interface Props {
  lanyardUrls: string[];
}

export default function PrintBatchButton({ lanyardUrls }: Props) {
  return (
    <PDFDownloadLink
      document={<PrintableLanyardsPDF lanyardUrls={lanyardUrls} />}
      fileName="lanyards-batch.pdf"
      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/20 text-white font-bold py-2.5 px-6 rounded-xl transition-all active:scale-[0.98]"
    >
      {({ loading }) => (loading ? 'Generating PDF...' : 'Download Print Batch')}
    </PDFDownloadLink>
  );
}
