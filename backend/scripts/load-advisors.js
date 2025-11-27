import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/db/pool.js';

const LEGACY_ADVISORS = {
  '1': 'Nan',
  '5': 'Gustavo Niklander Ribera',
  '9': 'Joaquin Gabriel Retamal Cardenas',
  '11': 'Frank Jesus Moreno Burgos',
  '13': 'Cristian Felipe Garrido Farias',
  '15': 'Camila Alejandra Abarca Reyes',
  '17': 'José Eduardo Cabello Valdivia',
  '19': 'Macarena Stevenson Aguirre',
  '21': 'María Inés Farias Sotelo',
  '23': 'Beatriz Margarita Zamorano Soza',
  '25': 'Pablo Andrés Hernández Arellano',
  '27': 'María Carolina Stark Campos',
  '29': 'Carolina Andrea Silva Martínez',
  '31': 'Angela Mariana Briones Rivas',
  '35': 'Mishell Vargas Sobrevilla',
  '39': 'Esteban Barahona Jimenez',
  '41': 'John Laura Mendoza',
  '43': 'Ana Lizeth Quiliche Damian',
  '45': 'Resp. Autom.',
  '1313': 'Ignacio Ribera',
  '3515': 'Bárbara Quijada',
  '3735': 'Fernando Fajardo',
  '3845': 'Patricia  Cortes',
  '4173': 'Rodrigo Palma',
  '4383': 'Milena Balladares',
  '4385': 'Camila Morán',
  '5681': 'Claudia Álvarez',
  '5767': 'Diego Bastías',
  '6123': 'Miguel Loza',
  '6955': 'Test 1',
  '6957': 'Prueba Nacho',
  '15593': 'Milena Balladares Ríos',
  '18715': 'Liliana Cardoso',
  '18717': 'Rui Mendes',
  '18719': 'Hugo Silva',
  '18721': 'Edith Soares',
  '18723': 'Amaia Oliveira',
  '18725': 'Teodoro Ribera',
  '18975': 'Sergio Cerecera',
  '28671': 'Paola Cornejo',
  '28995': 'Andrés Morales',
  '28997': 'Diego Moreno',
  '28999': 'José  Guevara',
  '29003': 'Julie  Beltran',
  '29005': 'Andrey Giron',
  '29041': 'Miguel Ustariz',
  '29285': 'Daniel David Gómez',
  '30025': 'Fabian Cordero',
  '31307': 'Paola Cornejo',
  '32165': 'Sofia Rojas',
  '33115': 'Rodrigo Palma Zavalla',
  '38743': 'Isabel  Carvajal',
  '38817': 'María  Farias',
  '39059': 'Scarlet  Palma',
  '39271': 'Frank Kliebs',
  '39535': 'Kendjy Bastien',
  '39645': 'Natalia Donoso',
  '40991': 'Kitty Guerrero',
  '41525': 'Johan Nunez',
  '42283': 'Daniela Martínez',
  '42285': 'Marjorie Cortes',
  '50433': 'Alonso Sepúlveda',
  '60247': 'Nicol Lemus',
  '60741': 'Lorena Ramirez',
  '60743': 'Constanza Guerrero',
  '60745': 'Genesis Valdes',
  '60747': 'Fabiola Inostroza',
  '60749': 'Yenni Garces',
  '60751': 'Pabla Vásquez',
  '60753': 'Carla Villar',
  '60755': 'Adan Díaz',
  '62741': 'Danna  Verdugo',
  '62743': 'Javiera González',
  '64693': 'Frank Moreno',
  '67589': 'Alirio  Sanchez ',
  '67591': 'Daniel  Cornejo Torres',
  '67593': 'Jennifer  Araya Flores',
  '67771': 'Jocelyn Alvarez',
  '67799': 'Claudia Aguilar',
  '68227': ' Javiera Constanza  Diocares Redel',
  '72531': 'Ivan De Mello Junior',
  '73709': 'Ivette  Herrera Ipg',
  '73711': 'Katherine Meyers Antiguo',
  '80803': 'Joceline Belen Hernandez Rivas',
  '83031': 'Jaime  Diaz Marin',
  '94905': 'Barbara  Meza Berrios',
  '101703': 'Felipe Orellana',
  '101829': 'Mauricio Arrieta',
  '107539': 'Ariel Garay',
  '110647': 'Sofia Gonçalves',
  '111587': 'Salman  Rizvii',
  '111785': 'Hugo Noronha',
  '111787': 'Rui Mourao',
  '111789': 'Susana Miranda',
  '111791': 'Larissa Repinaldo',
  '136205': 'Danitza Valdenegro',
  '136207': 'Almendra Gallardo',
  '136209': 'Clary San Martín',
  '136211': 'Camila Caniuqueo',
  '137157': 'Diego Diaz',
  '138549': 'Jannys Reyes',
  '150587': 'Eduardo Arias',
  '157177': 'Felipe Maraboli',
  '157953': 'Eduarda Silva',
  '159079': 'Karla Viacava Bustos',
  '159855': 'Postgrados Colombia',
  '165535': 'Catalina Vega',
  '166793': 'Joana Gonçalves Soares',
  '166867': 'Sigrid Rodriguez',
  '168765': 'Camila Cisternas',
  '169147': 'Asesor Internacional 1',
  '169149': 'Asesor Internacional 2',
  '169755': 'Brayian Saavedra',
  '170435': 'Ivette  Herrera',
  '178079': 'Laura Gabriela Acevedo Poza',
  '178323': 'Nicole Aguirre Serra',
  '178325': 'Katya Fernanda Figueroa Fuentes',
  '178327': 'Jody Alexandra Fuentes Sepúlveda',
  '182283': 'Javiera Diocares Redel',
  '182889': 'Rodrigo Hernan Cifuentes Soto',
  '200821': 'Jacqueline Rodriguez Quintanilla',
  '200939': 'Katya  Figueroa',
  '204493': 'Brayan Quinteros',
  '209211': 'Marcelo Ferreira Boscarino',
  '209213': 'Tamara González',
  '209215': 'Elizabeth Contrera',
  '209217': 'Julio Portillo',
  '233459': 'Gabriela García',
  '238763': 'Karla Mancilla Orellana',
  '238765': 'Claudia Retamal Mercado',
  '238767': 'Romina Vasquez',
  '238769': 'Milagros Soto Barreto',
  '244689': 'Pamela Veronica Gonzalez Donoso',
  '244691': 'Valentina Ninoska Vásquez Inostroza',
  '245155': 'Belén Alarcón',
  '255123': 'Maite Vallejos',
  '257367': 'Gian Gamarra',
  '258097': 'Belen Arriaga',
  '258665': 'Enrique Nesbit',
  '258667': 'Marcelo Arriagada',
  '258669': 'Thomas Prado',
  '258671': 'David Hernandez',
  '258673': 'Gerardo Acevedo',
  '267597': 'Alvaro Araneda',
  '267599': 'Danae Rubio',
  '268945': 'Katherine Meyers Vidal',
  '268947': 'Fabiola Inostroza',
  '279459': ' Eduardo Osses Garcia',
  '281615': 'Maria Daniela Ormeño',
  '281745': 'Claudio Guzman Cortes',
  '282823': 'Cynthia Cabañas',
  '283901': 'Zaida Verdugo Cifuentes',
  '285731': 'Genesis Valdes',
  '287613': 'Joaquin Gallo Machiavello',
  '298037': 'Hernán Lopez',
  '298057': 'Hernan Britez',
  '299955': 'Renata Rubio',
  '307865': 'Gabriel Herrera',
  '307929': 'Franco Rojas',
  '313653': 'Brenda Matamala',
  '319377': 'Jessica Archimil',
  '319389': 'Sharon Becker',
  '319435': 'Jessica Archimil',
  '321333': 'Jorge Sebastian Garcia Palma',
  '321335': 'Rodrigo Contreras bustorf',
  '323637': 'Maolys Carolina Serrano Garcia',
  '328249': 'Patricia Cantarero',
  '333933': 'Vicente Carrillo',
  '337635': 'Jorge Bustamante',
  '338989': 'Andrés Faundez',
  '338991': 'Claudio Carrasco',
  '346393': 'Eduardo Arias',
  '352587': 'Camila Mella',
  '352709': 'Vicente Farias',
  '361277': 'Diego Fernández',
  '368819': 'Constanza Huitraiqueo Garabito',
  '376401': 'Jaime Alarcón',
  '376425': 'Magdalena Ahumada',
  '380605': 'Beatriz Gonçalves',
  '380753': 'María Balladares',
  '394871': 'Edwin Coya',
  '395711': 'Alberto Mota',
  '395713': ' José Castro',
  '414057': 'Juan David Abril Garrido',
  '414059': 'Andres Santiago Muñoz Baquero',
  '414061': 'Juan Manuel Cely',
  '414063': 'María Lucía Riaño Cortes',
  '414065': 'Janette Cristina Vanegas Salcedo',
  '414067': 'Andrea Artunduaga',
  '414069': 'María Alejandra Betancourt Dussan',
  '425641': 'Matrículas Postgrados',
  '432307': 'Hector Eduardo Mathus Linero',
  '432763': 'Scarlette Parra Chávez',
  '442925': 'Diego Olivares',
  '445937': 'Alexander Palacios',
  '450123': 'Osvaldo Herrera',
  '451327': 'Nicole Wattier',
  '451329': 'Roberto Núñez',
  '451331': 'Nicolás Cabrera',
  '451333': 'Marcela Díaz',
  '451513': 'Ana Weldt',
  '455561': 'Edinet Niño Rangel',
  '455563': 'Claudia Viscay Ocares',
  '455565': 'Angiee Castro Moreno',
  '458153': 'Rodrigo Soto',
  '468607': 'Oscar Gutiérrez',
  '469427': 'Luis Rivera',
  '476073': 'Esther Carolina Ruiz Solís',
  '476075': 'Ana Pedrozo Román',
  '477307': 'Nicolás Serey',
  '477309': 'Reina Sarmiento',
  '477311': 'Franyer Gallardo',
  '477313': 'Marcela Díaz Zamorano',
  '477315': 'María Jesús Jiménez',
  '477317': 'Virginea Pineda',
  '477319': 'Marcela Saez',
  '478643': 'Chatapp',
  '479297': 'Daniela Caceres',
  '479439': 'Arnaldo Lopez',
  '479681': 'Yhoselin Vilca',
  '483205': 'Javiera Olate',
  '483207': 'Kyara San Martín',
  '483653': 'Juan Manuel Castro',
  '491207': 'Nataly Aravena',
  '491209': 'Barbara Velazco',
  '493543': 'Marcelo Ferreira',
  '497253': 'Vania Leon',
  '499447': 'Giselle Rojas',
  '499549': 'Gisselle Rojas'
};

const ROSTER_ADVISORS = [
  { id: 900001, name: 'Barbara Quijada Carrasco', correoInstitucional: 'barbara.quijada@uautonoma.cl', institucion: 'Asesor/a Comercial/Temuco', correoPersonal: '', telefono: '', rut: '' },
  { id: 900002, name: 'Camila Alejandra Abarca Reyes', correoInstitucional: 'camila.abarca@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 9924 6918', rut: '20.334.xxx-x' },
  { id: 900003, name: 'Carolina Silva Martinez', correoInstitucional: 'carolina.silva@uautonoma.cl', institucion: 'Coordinador/a', correoPersonal: '', telefono: '', rut: '' },
  { id: 900004, name: 'Catalina', correoInstitucional: 'adinistrativocontable.postgrado@uautonoma.cl', institucion: 'Administrativo Contable', correoPersonal: '', telefono: '', rut: '' },
  { id: 900005, name: 'Clary San Martin', correoInstitucional: 'postulaciones.postgrado@uautonoma.cl', institucion: 'Administrativo Contable', correoPersonal: '', telefono: '', rut: '' },
  { id: 900006, name: 'Constanza Andrea Huitraiqueo Garabito', correoInstitucional: 'asesor.internacional8@uautonoma.cl', institucion: 'Asesor/Triple certificación', correoPersonal: '', telefono: '56 9 4290 4041', rut: '20.353.xxx-x' },
  { id: 900007, name: 'Danae Xiomara Rubio Morales', correoInstitucional: 'asesor.internacional7@uautonoma.cl', institucion: 'Asesor/Triple certificación', correoPersonal: '', telefono: '56 9 6766 5626', rut: '20.420.xxx-x' },
  { id: 900008, name: 'Danna Verdugo', correoInstitucional: 'coordinacion.internacional@uautonoma.cl', institucion: 'Coordinador/a', correoPersonal: '', telefono: '', rut: '' },
  { id: 900009, name: 'Diego Olivares', correoInstitucional: 'asesor.internacional10@uautonoma.cl', institucion: 'Asesor/Triple certificación', correoPersonal: '', telefono: '', rut: '' },
  { id: 900010, name: 'Eduardo Antonio Arias Farfán', correoInstitucional: 'asesor.postgrados3@uautonoma.cl', institucion: 'Asesor/a Comercial/Temuco', correoPersonal: '', telefono: '56 9 7800 6803', rut: '16.973.xxx-x' },
  { id: 900011, name: 'Fabiola Valeria Inostroza Díaz', correoInstitucional: 'asesor.postgrados7@uautonoma.cl', institucion: 'Asesor/a Comercial/Temuco', correoPersonal: '', telefono: '56 9 7437 6404', rut: '14.221.xxx-x' },
  { id: 900012, name: 'Franco Nicolas Rojas Sandoval', correoInstitucional: 'postgrados.informatica@uautonoma.cl', institucion: 'Analista Informatica', correoPersonal: 'nico29.fs@gmail.com', telefono: '569 58402356', rut: '18.892.xxx-x' },
  { id: 900013, name: 'Gabriel Aaron Herrera Garrido', correoInstitucional: 'asesor.internacional6@uautonoma.cl', institucion: 'Asesor/Triple certificación', correoPersonal: '', telefono: '56 9 2089 7099', rut: '21.483.xxx-x' },
  { id: 900014, name: 'Gabriela Rojas', correoInstitucional: 'adinistrativocontable.postgrado@uautonoma.cl', institucion: 'Administrativo Contable', correoPersonal: '', telefono: '', rut: '' },
  { id: 900015, name: 'Génesis Sarai Valdés', correoInstitucional: 'asesor.postgrados8@uautonoma.cl', institucion: 'Asesor/a Comercial/Temuco', correoPersonal: '', telefono: '56 9 7427 2929', rut: '19.498.xxx-x' },
  { id: 900016, name: 'Isabel Carvajal Garate', correoInstitucional: 'asesor.postgrados4@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 2624 7933 / +56 9 4475 2381 (llamadas)', rut: '19.276.xxx-x' },
  { id: 900017, name: 'Ivette Camila Herrera Jara', correoInstitucional: 'asesor.postgrados1@uautonoma.cl', institucion: 'Asesor/a Comercial/Temuco', correoPersonal: '', telefono: '56 9 7874 1817', rut: '20.354.xxx-x' },
  { id: 900018, name: 'Javiera Constanza Diocares Redel', correoInstitucional: 'Asesor.postgrados2@uautonoma.cl', institucion: 'Asesor/a Comercial/Temuco', correoPersonal: '', telefono: '56 9 4475 2380', rut: '20.081.xxx-x' },
  { id: 900019, name: 'Joaquín Retamal', correoInstitucional: '', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 8850 8037', rut: '19.839.xxx-x' },
  { id: 900020, name: 'Jody Fuentes', correoInstitucional: 'matriculas.postgrados@uautonoma.cl', institucion: 'Administrativo Contable', correoPersonal: '', telefono: '', rut: '' },
  { id: 900021, name: 'Jorge Luis Bustamante Gallardo', correoInstitucional: 'asesor.postgrados9@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 3331 3710', rut: '15.428.xxx-x' },
  { id: 900022, name: 'José Eduardo Cabello Valdivia', correoInstitucional: 'j.cabello@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 8901 9213', rut: '17.058.xxx-x' },
  { id: 900023, name: 'Katherine Elizabeth Meyers Vidal', correoInstitucional: 'asesor.postgrados6@uautonoma.cl', institucion: 'Asesor/a Comercial/Temuco', correoPersonal: '', telefono: '56 9 5227 6723', rut: '19.224.xxx-x' },
  { id: 900024, name: 'Macarena Stevenson Aguirre', correoInstitucional: 'macarena.stevenson@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 3612 9526', rut: '16.358.xxx-x' },
  { id: 900025, name: 'Maite Vallejos', correoInstitucional: 'postmatricula.postgrados@uautonoma.cl', institucion: 'Postmatrícula', correoPersonal: '', telefono: '', rut: '' },
  { id: 900026, name: 'María Balladares', correoInstitucional: '', institucion: 'Asesor/Triple certificación', correoPersonal: '', telefono: '', rut: '' },
  { id: 900027, name: 'María Inés Farías Sotelo', correoInstitucional: 'mariaines.farias@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 8809 0403', rut: '13.467.xxx-x' },
  { id: 900028, name: 'Milena Rocío Balladares Ríos', correoInstitucional: 'postgrados.online@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 3531 5478', rut: '20.124.xxx-x' },
  { id: 900029, name: 'Oscar Gutierrez', correoInstitucional: 'marketing.postgrados2@uautonoma.cl', institucion: 'Analista de Marketing', correoPersonal: 'o.gutierrez.19@gmail.com', telefono: '56 9 44810110', rut: '16.879.xxx-x' },
  { id: 900030, name: 'Osvaldo Enrique Herrera Cuevas', correoInstitucional: 'postgrados1@uautonoma.cl', institucion: 'Analista Informatica', correoPersonal: 'herrera.cuevaso.e@gmail.com', telefono: '56948431272', rut: '20.833.xxx-x' },
  { id: 900031, name: 'Pablo Hernandez', correoInstitucional: 'pablo.hernandez@uautonoma.cl', institucion: 'Coordinador/a', correoPersonal: '', telefono: '', rut: '' },
  { id: 900032, name: 'Scarlette Parra', correoInstitucional: 'asesor.internacional9@uautonoma.cl', institucion: 'Asesor/Triple certificación', correoPersonal: '', telefono: '', rut: '' },
  { id: 900033, name: 'Vicente Farias', correoInstitucional: 'marketing.postgrados@uautonoma.cl', institucion: 'Analista de Marketing', correoPersonal: 'vicente_f.lira@hotmail.com', telefono: '56933511866', rut: '20.591.xxx-x' },
  { id: 900034, name: 'Zaida Verdugo Cifuentes', correoInstitucional: 'asesor.postgrados5@uautonoma.cl', institucion: 'Asesor Comercial/Santiago', correoPersonal: '', telefono: '56 9 2621 8500', rut: '19.985.xxx-x' }
];

function normalizeWhitespace (value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeName (name = '') {
  return normalizeWhitespace(name);
}

function normalizeEmail (value = '') {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized || null;
}

function normalizeOptional (value = '') {
  const normalized = normalizeWhitespace(value);
  return normalized || null;
}

function normalizeRut (value = '') {
  const cleaned = value.replace(/[.\s-]/g, '').toUpperCase();
  return cleaned || null;
}

function buildBaseUsername ({ correo, correo_personal: correoPersonal, rut, id }) {
  if (correo) return correo;
  if (correoPersonal) return correoPersonal;
  if (rut) return `${rut.toLowerCase()}@asesores.local`;
  return `asesor_${id}@asesores.local`;
}

function withSuffix (username, suffix) {
  if (!suffix) return username;
  if (username.includes('@')) {
    const [local, domain] = username.split('@');
    return `${local}+${suffix}@${domain}`;
  }
  return `${username}_${suffix}`;
}

async function ensureUserColumns () {
  await db.query(`
    ALTER TABLE "comision_ua"."users"
      ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(160),
      ADD COLUMN IF NOT EXISTS correo_institucional VARCHAR(160),
      ADD COLUMN IF NOT EXISTS correo_personal VARCHAR(160),
      ADD COLUMN IF NOT EXISTS telefono VARCHAR(60),
      ADD COLUMN IF NOT EXISTS rut VARCHAR(20),
      ADD COLUMN IF NOT EXISTS sede VARCHAR(120),
      ADD COLUMN IF NOT EXISTS legacy_asesor_id INTEGER,
      ADD COLUMN IF NOT EXISTS is_asesor BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_schema = 'comision_ua'
          AND table_name = 'users'
          AND constraint_name = 'users_legacy_asesor_id_key'
      ) THEN
        ALTER TABLE "comision_ua"."users"
        ADD CONSTRAINT users_legacy_asesor_id_key UNIQUE (legacy_asesor_id);
      END IF;
    END $$;
  `);
}

async function ensureLegacySequence () {
  await db.query('CREATE SEQUENCE IF NOT EXISTS "comision_ua".asesores_id_seq OWNED BY NONE');
  const { rows } = await db.query('SELECT MAX(legacy_asesor_id) AS max_id FROM "comision_ua"."users"');
  const maxId = Number(rows[0]?.max_id) || 0;
  await db.query(`SELECT setval('"comision_ua".asesores_id_seq', GREATEST($1, 1))`, [maxId]);
}

async function ensureAdvisorUser (entry, passwordHash) {
  const nombreCompleto = entry.name || `Asesor ${entry.id}`;
  const correo = entry.correo;
  const correoPersonal = entry.correo_personal;
  const telefono = entry.telefono;
  const rut = entry.rut;
  const sede = entry.sede;
  let username = buildBaseUsername({ correo, correo_personal: correoPersonal, rut, id: entry.id });
  let attempts = 0;

  while (true) {
    const { rows } = await db.query('SELECT legacy_asesor_id FROM "comision_ua"."users" WHERE username = $1 LIMIT 1', [username]);
    if (rows.length === 0 || rows[0].legacy_asesor_id === entry.id) {
      break;
    }
    attempts += 1;
    username = withSuffix(username, `${entry.id}-${attempts}`);
  }

  await db.query(
    `INSERT INTO "comision_ua"."users"
      (username, password_hash, role, nombre_completo, correo_institucional, correo_personal, telefono, rut, sede, legacy_asesor_id, is_asesor)
     VALUES ($1, $2, 'advisor', $3, $4, $5, $6, $7, $8, $9, TRUE)
     ON CONFLICT (legacy_asesor_id) DO UPDATE SET
       username = EXCLUDED.username,
       nombre_completo = EXCLUDED.nombre_completo,
       correo_institucional = EXCLUDED.correo_institucional,
       correo_personal = EXCLUDED.correo_personal,
       telefono = EXCLUDED.telefono,
       rut = EXCLUDED.rut,
       sede = EXCLUDED.sede,
       is_asesor = TRUE`,
    [
      username,
      passwordHash,
      nombreCompleto,
      correo,
      correoPersonal,
      telefono,
      rut,
      sede,
      entry.id
    ]
  );
}

async function run () {
  await ensureUserColumns();
  await ensureLegacySequence();

  const defaultPassword = process.env.ADVISOR_DEFAULT_PASSWORD;
  if (!defaultPassword) {
    throw new Error('Debes definir ADVISOR_DEFAULT_PASSWORD en tu .env antes de sincronizar asesores.');
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const legacyEntries = Object.entries(LEGACY_ADVISORS)
    .map(([id, name]) => ({
      id: Number(id),
      name: normalizeName(name),
      correo: null,
      correo_personal: null,
      telefono: null,
      rut: null,
      sede: null
    }))
    .filter((item) => Number.isInteger(item.id) && item.name.length);

  const rosterEntries = ROSTER_ADVISORS.map((advisor) => ({
    id: Number(advisor.id),
    name: normalizeName(advisor.name),
    correo: normalizeEmail(advisor.correoInstitucional || ''),
    correo_personal: normalizeEmail(advisor.correoPersonal || ''),
    telefono: normalizeOptional(advisor.telefono || ''),
    rut: normalizeRut(advisor.rut || ''),
    sede: normalizeOptional(advisor.institucion || '')
  }))
    .filter((entry) => Number.isInteger(entry.id) && entry.name.length);

  const entries = [...legacyEntries, ...rosterEntries];

  if (!entries.length) {
    console.log('No hay asesores para procesar.');
    process.exit(0);
  }

  for (const entry of entries) {
    await ensureAdvisorUser(entry, passwordHash);
  }

  console.log(`Se cargaron/actualizaron ${entries.length} asesores (tabla users).`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Fallo al cargar asesores:', err);
  process.exit(1);
});
