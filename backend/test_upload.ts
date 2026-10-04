import fs from 'fs';
import path from 'path';

async function run() {
  const file1 = 'test1.jpg';
  const file2 = 'test2.jpg';
  fs.writeFileSync(file1, 'fake image data 1');
  fs.writeFileSync(file2, 'fake image data 2 completely different');

  const formData1 = new FormData();
  formData1.append('image', new Blob([fs.readFileSync(file1)]), file1);

  const res1 = await fetch('http://localhost:5000/api/drone/analyze', {
    method: 'POST',
    body: formData1
  });
  const data1 = await res1.json();
  console.log('Result 1:', data1.detections.length, 'detections');

  const formData2 = new FormData();
  formData2.append('image', new Blob([fs.readFileSync(file2)]), file2);
  const res2 = await fetch('http://localhost:5000/api/drone/analyze', {
    method: 'POST',
    body: formData2
  });
  const data2 = await res2.json();
  console.log('Result 2:', data2.detections.length, 'detections');
  
  if (JSON.stringify(data1.detections) === JSON.stringify(data2.detections)) {
    console.error('FAILED: Detections are identical for different images!');
    process.exit(1);
  }
  console.log('SUCCESS: Detections differ for different images!');
  process.exit(0);
}
run();
