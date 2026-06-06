import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestDocument() {
  console.log('📄 Creating test document with OCR results...\n');
  
  try {
    // Create or get test user
    let user = await prisma.user.findUnique({
      where: { email: 'test@intellidocs.ai' },
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test@intellidocs.ai',
          password: '$2b$10$test.hash.placeholder', // bcrypt hash placeholder
          name: 'Test User',
          role: 'user',
        },
      });
      console.log('✅ Created test user:', user.id);
    } else {
      console.log('✅ Using existing test user:', user.id);
    }
    
    // Create a test document
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        fileName: 'test-ml-document.pdf',
        fileSize: 2048,
        pageCount: 3,
        storageUrl: 's3://intellidocs-documents/test/test-ml-document.pdf',
        ocrApplied: true,
        ocrLanguages: ['en'],
      },
    });
    
    console.log('✅ Created document:', document.id);
    
    // Create OCR results for multiple pages
    const pages = [
      {
        pageNumber: 1,
        text: `Introduction to Machine Learning
        
Machine learning is a subset of artificial intelligence that focuses on building systems that can learn from and make decisions based on data. It involves training algorithms on large datasets to recognize patterns and make predictions.

There are three main types of machine learning:
1. Supervised Learning - Learning from labeled data
2. Unsupervised Learning - Finding patterns in unlabeled data
3. Reinforcement Learning - Learning through trial and error

Machine learning has applications in various fields including healthcare, finance, autonomous vehicles, and natural language processing.`
      },
      {
        pageNumber: 2,
        text: `Deep Learning and Neural Networks

Deep learning is a specialized branch of machine learning that uses artificial neural networks with multiple layers. These networks are inspired by the structure and function of the human brain.

Key concepts in deep learning:
- Convolutional Neural Networks (CNNs) for image processing
- Recurrent Neural Networks (RNNs) for sequential data
- Transformers for natural language understanding
- Generative Adversarial Networks (GANs) for content generation

Deep learning has revolutionized computer vision, speech recognition, and language translation.`
      },
      {
        pageNumber: 3,
        text: `Natural Language Processing

Natural Language Processing (NLP) is a field that combines linguistics and machine learning to enable computers to understand, interpret, and generate human language.

Common NLP tasks include:
- Text classification and sentiment analysis
- Named entity recognition
- Machine translation
- Question answering systems
- Text summarization

Modern NLP systems use transformer-based models like BERT, GPT, and T5 to achieve state-of-the-art performance on various language tasks.`
      },
    ];
    
    for (const page of pages) {
      await prisma.oCRResult.create({
        data: {
          documentId: document.id,
          pageNumber: page.pageNumber,
          rawText: page.text,
          language: 'en',
          cerScore: 0.02,
          werScore: 0.01,
          tesseractConfidence: 95.0,
        },
      });
      
      console.log(`✅ Created OCR result for page ${page.pageNumber}`);
    }
    
    console.log(`\n✅ Test document created successfully!`);
    console.log(`   Document ID: ${document.id}`);
    console.log(`   Pages: ${pages.length}`);
    console.log(`\n📝 Next step: Generate embeddings`);
    console.log(`   curl -X POST http://localhost:3000/embeddings/generate/${document.id}`);
    
    return document.id;
    
  } catch (error) {
    console.error('❌ Error creating test document:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestDocument()
  .then((docId) => {
    console.log(`\n🎉 Success! Document ID: ${docId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
