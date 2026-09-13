import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { Mahasiswa, PhotoRecord } from '../types';

/**
 * Generates and downloads a beautifully styled Word Document (.docx)
 * representing the student's introduction progress report.
 */
export async function generateStudentReport(
  currentUser: Mahasiswa,
  allStudents: Mahasiswa[],
  photoRecords: PhotoRecord[]
): Promise<void> {
  // Filter out current user from targets
  const targetFriends = allStudents.filter(
    (s) => s.nim !== currentUser.nim && s.id !== currentUser.id
  );

  // Match photo records for this user
  const takenPhotos = photoRecords.filter((r) => {
    const isUploader = r.uploaderNim?.toLowerCase() === currentUser.nim?.toLowerCase();
    const isTarget = r.targetNim?.toLowerCase() === currentUser.nim?.toLowerCase();
    return isUploader || isTarget;
  });

  const totalFriends = targetFriends.length;
  const takenCount = takenPhotos.length;
  const percentage = totalFriends > 0 ? Math.round((takenCount / totalFriends) * 100) : 0;
  const tanggalUnduh = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Construct Document using the modern docx library API
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header / Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'LAPORAN TUGAS PERKENALAN MAHASISWA',
                bold: true,
                size: 28,
                color: '1E3A8A', // Navy color
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'LOGIKA 2026 - TEKNIK INFORMATIKA',
                bold: true,
                size: 22,
                color: '475569', // Slate color
                font: 'Calibri',
              }),
            ],
          }),

          // Divider Line
          new Paragraph({
            spacing: { after: 300 },
            border: {
              bottom: {
                color: 'CBD5E1',
                size: 12,
                style: BorderStyle.SINGLE,
              },
            },
            children: [],
          }),

          // Section 1: Profil Mahasiswa
          new Paragraph({
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: 'I. PROFIL MAHASISWA',
                bold: true,
                size: 24,
                color: '1E3A8A',
                font: 'Calibri',
              }),
            ],
          }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Nama Lengkap', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: currentUser.namaLengkap, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'NIM', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: currentUser.nim, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Kelompok', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: currentUser.kelompok, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Asal Rumah', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: currentUser.asalRumah || '-', font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Hobi', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: currentUser.hobi || '-', font: 'Calibri' })] })],
                  }),
                ],
              }),
            ],
          }),

          // Section 2: Ringkasan Progress Foto
          new Paragraph({
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: 'II. RINGKASAN PROGRESS TUGAS FOTO BERSAMA',
                bold: true,
                size: 24,
                color: '1E3A8A',
                font: 'Calibri',
              }),
            ],
          }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Total Anggota Kelompok / Teman', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: `${totalFriends} mahasiswa`, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Jumlah Foto Bersama Terlaksana', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `${takenCount} foto bersama`, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Persentase Penyelesaian', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `${percentage}% selesai`, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Status Kelulusan Tugas', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: percentage === 100 ? 'LULUS / SELESAI' : 'BELUM SELESAI (DALAM PROSES)',
                            bold: true,
                            color: percentage === 100 ? '16A34A' : 'DC2626',
                            font: 'Calibri',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Section 3: Daftar Detail Foto Bersama
          new Paragraph({
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: 'III. DAFTAR DETIL FOTO BERSAMA TEMAN',
                bold: true,
                size: 24,
                color: '1E3A8A',
                font: 'Calibri',
              }),
            ],
          }),

          // Detailed Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Table Header
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Nama Teman', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'NIM', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Kelompok', bold: true, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Tanggal Upload', bold: true, font: 'Calibri' })] })],
                  }),
                ],
              }),
              // Data Rows
              ...targetFriends.map((friend, idx) => {
                const photo = takenPhotos.find((p) => {
                  const withUploader = p.uploaderNim?.toLowerCase() === friend.nim?.toLowerCase() || p.targetNim?.toLowerCase() === friend.nim?.toLowerCase();
                  return withUploader;
                });

                const dateStr = photo?.timestamp
                  ? new Date(photo.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '-';

                return new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), font: 'Calibri' })] })],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: friend.namaLengkap,
                              bold: true,
                              font: 'Calibri',
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: friend.nim, font: 'Calibri' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: friend.kelompok, font: 'Calibri' })] })],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: photo ? 'Sudah Foto' : 'Belum Foto',
                              color: photo ? '16A34A' : 'DC2626',
                              bold: true,
                              font: 'Calibri',
                            }),
                            new TextRun({
                              text: photo ? ` (${dateStr})` : '',
                              color: '64748B',
                              font: 'Calibri',
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                });
              }),
            ],
          }),

          // Footer info
          new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Laporan ini diunduh secara otomatis melalui portal Logika 2026.`,
                italics: true,
                size: 18,
                color: '64748B',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Waktu Unduh: ${tanggalUnduh}`,
                italics: true,
                size: 18,
                color: '64748B',
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Packer handles compiling & generating Blob
  const blob = await Packer.toBlob(doc);
  const formattedName = currentUser.namaLengkap.replace(/[\s\W]+/g, '_');
  saveAs(blob, `Laporan_Tugas_Foto_${currentUser.nim}_${formattedName}.docx`);
}
