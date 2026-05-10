import React from 'react';
import { Document, Page, Image, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
    alignContent: 'flex-start',
  },
  lanyardWrapper: {
    width: '48%',
    height: '48%', // A4 aspect ratio supports roughly this for 2x2 grid
    marginBottom: '2%',
    position: 'relative',
    border: '1px dashed #d1d5db', // thin gray border for cutting
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  cropMarkTopLeft: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 10,
    height: 10,
    borderTop: '1px solid #9ca3af',
    borderLeft: '1px solid #9ca3af',
  },
  cropMarkTopRight: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 10,
    height: 10,
    borderTop: '1px solid #9ca3af',
    borderRight: '1px solid #9ca3af',
  },
  cropMarkBottomLeft: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 10,
    height: 10,
    borderBottom: '1px solid #9ca3af',
    borderLeft: '1px solid #9ca3af',
  },
  cropMarkBottomRight: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 10,
    height: 10,
    borderBottom: '1px solid #9ca3af',
    borderRight: '1px solid #9ca3af',
  },
});

interface PrintableLanyardsPDFProps {
  lanyardUrls: string[];
}

export function PrintableLanyardsPDF({ lanyardUrls }: PrintableLanyardsPDFProps) {
  // Chunk URLs into groups of 4 per page
  const pages = [];
  for (let i = 0; i < lanyardUrls.length; i += 4) {
    pages.push(lanyardUrls.slice(i, i + 4));
  }

  return (
    <Document>
      {pages.map((pageUrls, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pageUrls.map((url, index) => (
            <View key={index} style={styles.lanyardWrapper}>
              {/* Crop Marks */}
              <View style={styles.cropMarkTopLeft} />
              <View style={styles.cropMarkTopRight} />
              <View style={styles.cropMarkBottomLeft} />
              <View style={styles.cropMarkBottomRight} />
              
              {/* Note: @react-pdf/renderer Image component needs a URL */}
              <Image src={url} style={styles.image} />
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
