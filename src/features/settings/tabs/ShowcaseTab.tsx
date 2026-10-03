import type React from 'react';
import { useMemo, useState } from 'react';
import { Eye, Moon, Sun, Student, MagnifyingGlass, FloppyDisk } from '@phosphor-icons/react';
import { useDesignSystem } from '../../../context/DesignSystemContext';
import { DESIGN_SYSTEMS, type DesignSystemKey, type DesignSystemMode } from '../../../types';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from '../../../components/ui';
import { buildPreviewVars, getPreviewPalette, primitiveContrastChecks } from './showcaseTokens';

const STATUS_SAMPLES = [
  { label: 'Hadir', cls: 'bg-status-success text-status-success' },
  { label: 'Izin', cls: 'bg-status-warning text-status-warning' },
  { label: 'Sakit', cls: 'bg-status-info text-status-info' },
  { label: 'Alpa', cls: 'bg-status-danger text-status-danger' },
];

const CLASS_OPTIONS = [
  { value: '7A', label: 'Kelas 7A' },
  { value: '7B', label: 'Kelas 7B' },
  { value: '8A', label: 'Kelas 8A' },
];

/**
 * Read-only design system preview. Selection lives in local state and is applied
 * as scoped --ds-* variables on the preview container only. It never calls
 * setSystem/setMode/applyAndSave*, so the teacher's saved theme (localStorage and
 * Firestore) and the rest of the app are untouched.
 */
export const ShowcaseTab: React.FC = () => {
  const { activeSystem, mode } = useDesignSystem();
  const [previewSystem, setPreviewSystem] = useState<DesignSystemKey>(activeSystem);
  const [previewMode, setPreviewMode] = useState<DesignSystemMode>(mode);

  const previewVars = useMemo(
    () => buildPreviewVars(previewSystem, previewMode),
    [previewSystem, previewMode],
  );
  const { option, colors } = getPreviewPalette(previewSystem, previewMode);
  const checks = useMemo(() => primitiveContrastChecks(colors), [colors]);
  const failCount = checks.filter((c) => !c.pass).length;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye aria-hidden="true" className="h-5 w-5" /> Pratinjau Design System
          </CardTitle>
          <CardDescription>
            Coba ketiga design system dan kedua mode pada komponen dasar. Pratinjau ini tidak
            menyimpan apa pun: tema akun Anda tetap sama. Untuk mengganti tema, gunakan tab
            Preferensi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="group" aria-label="Pilih design system" className="flex flex-wrap gap-2">
            {DESIGN_SYSTEMS.map((ds) => (
              <Button
                key={ds.id}
                size="sm"
                variant={ds.id === previewSystem ? 'primary' : 'outline'}
                aria-pressed={ds.id === previewSystem}
                onClick={() => setPreviewSystem(ds.id)}
              >
                {ds.name}
              </Button>
            ))}
          </div>
          <div role="group" aria-label="Pilih mode" className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={previewMode === 'light' ? 'primary' : 'outline'}
              aria-pressed={previewMode === 'light'}
              icon={<Sun className="h-4 w-4" />}
              onClick={() => setPreviewMode('light')}
            >
              Terang
            </Button>
            <Button
              size="sm"
              variant={previewMode === 'dark' ? 'primary' : 'outline'}
              aria-pressed={previewMode === 'dark'}
              icon={<Moon className="h-4 w-4" />}
              onClick={() => setPreviewMode('dark')}
            >
              Gelap
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scoped theme: components below read --ds-* from this container, exactly
          as they would from :root in the real app. No colour props are passed. */}
      <section
        data-testid="ds-preview"
        data-preview-system={previewSystem}
        data-preview-mode={previewMode}
        aria-label={`Pratinjau ${option.name}, mode ${previewMode === 'dark' ? 'gelap' : 'terang'}`}
        className="flex flex-col gap-5 p-5 bg-[var(--ds-surface)] text-[var(--ds-text)]"
        style={
          {
            ...previewVars,
            borderRadius: 'var(--ds-radius-lg)',
            fontFamily: 'var(--ds-font-sans)',
          } as React.CSSProperties
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={<FloppyDisk className="h-4 w-4" />}>
            Simpan Nilai
          </Button>
          <Button variant="secondary">Draf</Button>
          <Button variant="outline">Ekspor</Button>
          <Button variant="ghost">Batal</Button>
          <Button variant="danger">Hapus</Button>
          <Button variant="primary" loading>
            Menyimpan
          </Button>
          <Button variant="primary" disabled>
            Nonaktif
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Kecil</Button>
          <Button size="md">Sedang</Button>
          <Button size="lg">Besar</Button>
        </div>

        <Card
          padding="none"
          className={previewSystem === 'paper-craft' ? 'ds-texture-paper overflow-hidden' : 'overflow-hidden'}
        >
          {previewSystem === 'neo-brutalism' && (
            <div data-testid="hazard-bar" aria-hidden="true" className="ds-hazard-bar" />
          )}
          <div className="flex flex-col gap-4 p-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Student aria-hidden="true" className="h-5 w-5" /> Input Nilai Harian
              </CardTitle>
              <CardDescription>Contoh formulir dengan komponen Input dan Select.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nama siswa"
                  placeholder="Cari nama siswa..."
                  helperText="Ketik minimal 3 huruf."
                  leftIcon={<MagnifyingGlass className="h-4 w-4" />}
                />
                <Select label="Kelas" placeholder="Pilih kelas" options={CLASS_OPTIONS} />
                <Input label="NISN" defaultValue="12345" error="NISN harus 10 digit." />
                <Input label="Nilai" placeholder="0-100" disabled />
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Contoh status kehadiran">
                {STATUS_SAMPLES.map((s) => (
                  <span
                    key={s.label}
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold ${s.cls}`}
                    style={{ borderRadius: 'var(--ds-radius-full)' }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost">Batal</Button>
              <Button variant="primary">Simpan</Button>
            </CardFooter>
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Laporan kontras WCAG ({option.name}, {previewMode === 'dark' ? 'gelap' : 'terang'})</CardTitle>
          <CardDescription>
            Dihitung langsung dari token. Batas: teks normal 4.5:1, elemen non-teks 3:1. Hanya
            mencakup pasangan warna pada komponen di atas, bukan seluruh aplikasi.{' '}
            {failCount > 0 ? `${failCount} pasangan belum memenuhi.` : 'Semua pasangan memenuhi.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="contrast-table">
              <thead className="text-[var(--ds-text-muted)]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Pasangan</th>
                  <th className="py-2 pr-3 font-medium">Warna</th>
                  <th className="py-2 pr-3 font-medium">Rasio</th>
                  <th className="py-2 font-medium">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.label} style={{ borderTop: '1px solid var(--ds-border)' }}>
                    <td className="py-2 pr-3">{c.label}</td>
                    <td className="py-2 pr-3 font-mono">
                      {c.fg} / {c.bg}
                    </td>
                    <td className="py-2 pr-3 font-mono">
                      {c.ratio.toFixed(2)}:1 (min {c.threshold})
                    </td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 font-semibold ${c.pass ? 'bg-status-success text-status-success' : 'bg-status-danger text-status-danger'}`}
                        style={{ borderRadius: 'var(--ds-radius-sm)' }}
                      >
                        {c.pass ? 'Lulus' : 'Gagal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
