import { GetServerSideProps } from 'next';
import Layout from '@/components/layout';
import ReportBuilder from '@/components/report-builder';
import Breadcrumb from '@/components/breadcrumb';
import { defaultMetaProps } from '@/components/layout/meta';

export default function ReportBuilderPage() {
  return (
    <Layout meta={{
      ...defaultMetaProps,
      title: 'Reports - Cisco Meraki Dashboard',
      description: 'Generate and export custom reports from your Cisco Meraki data'
    }}>
      <div className="min-h-screen bg-color-background-100">
        <ReportBuilder />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {}
  };
};
