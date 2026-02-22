import React from 'react';
import { Site } from '@/src/lib/types';
// import { useEquipment } from '@/src/hooks/useEquipment';

/**
 * BEFORE: Fetching Associated Data On-The-Fly (N+1 Query Problem)
 * ------------------------------------------------------------------
 * In the relational model, we only had equipmentIds on the Site.
 * We had to fetch the master equipment records for every row.
 * This caused slow page loads and X reads for every site.
 */

/*
export function SiteEquipmentTableBefore({ site }: { site: { equipmentIds: string[] } }) {
  // Expensive N+1 hook or we had to fetch and merge upstream
  // Imagine this hook fires off a query for each ID
  const equipmentDetails = site.equipmentIds.map(id => useEquipment(id));

  if (equipmentDetails.some(eq => eq.loading)) return <p>Loading Equipment...</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>Vendor</th>
          <th>Throughput</th>
        </tr>
      </thead>
      <tbody>
        {equipmentDetails.map(eq => (
          <tr key={eq.data?.id}>
            <td>{eq.data?.model}</td>
            <td>{eq.data?.vendor_id}</td>
            <td>{eq.data?.specs.sdwanCryptoThroughputMbps} Mbps</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
*/

/**
 * AFTER: Denormalized Embedded Data
 * ------------------------------------------------------------------
 * Because we embed perfectly sized snapshots when the equipment is 
 * attached to the site (via SiteBOMService), we do 0 extra queries here.
 * The site document ALREADY has exactly what it needs to render!
 */

export function SiteEquipmentTableAfter({ site }: { site: Site }) {
  // Instant render - no loading states necessary for the row data! Let's go!

  if (!site.embeddedEquipment || site.embeddedEquipment.length === 0) {
    return <p>No equipment attached to this site.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-6 py-3">Model</th>
            <th className="px-6 py-3">Vendor ID</th>
            <th className="px-6 py-3">Throughput</th>
            <th className="px-6 py-3">Ports</th>
            <th className="px-6 py-3">Attached Date</th>
          </tr>
        </thead>
        <tbody>
          {site.embeddedEquipment.map((eq) => (
            <tr key={eq.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{eq.model}</td>
              <td className="px-6 py-4 uppercase">{eq.vendor_id}</td>
              <td className="px-6 py-4">{eq.specs_summary?.throughput ?? 'N/A'} Mbps</td>
              <td className="px-6 py-4">{eq.specs_summary?.ports ?? 'N/A'}</td>
              <td className="px-6 py-4">{new Date(eq.addedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
