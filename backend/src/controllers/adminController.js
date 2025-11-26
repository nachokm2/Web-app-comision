import { getAllTableData, getCasesByAdvisor } from '../services/schemaService.js';

export async function getSchemaSnapshot (req, res) {
  const [tables, casesByAdvisor] = await Promise.all([
    getAllTableData(),
    getCasesByAdvisor()
  ]);

  res.json({ tables, casesByAdvisor });
}
