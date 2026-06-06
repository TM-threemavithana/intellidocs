// Create a test document with OCR results for embedding testing
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://intellidocs:intellidocs_dev_password@localhost:5432/intellidocs_db?schema=public'
    }
  }
});

async function createTestDocument() {
  console.log('📄 Creating test document with OCR results...\n');
  
  try {
    // Create a test document
    const document = await prisma.document.create({
      data: {
        fileName: 'test-document.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 'test/test-document.pdf',
        status: 'completed',
        userId: 'test-user',
      },
    });
    
    console.log('✅ Created document:', document.id);
    
    // Create OCR results for multiple pages
    const ocrResults = [];
    
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
      const ocr = await prisma.oCRResult.create({
        data: {
          documentId: document.id,
          pageNumber: page.pageNumber,
          rawText: page.text,
          confidence: 0.95,
          language: 'eng',
          processingTime: 1000,
          characterErrorRate: 0.02,
          wordErrorRate: 0.01,
        },
      });
      
      ocrResults.push(ocr);
      console.log(`✅ Created OCR result for page ${page.pageNumber}`);
    }
    
    console.log(`\n✅ Test document created successfully!`);
    console.log(`   Document ID: ${document.id}`);
    console.log(`   Pages: ${ocrResults.length}`);
    console.log(`\n📝 Next step: Generate embeddings`);
    console.log(`   curl -X POST http://localhost:3000/embeddings/generate/${document.id}`);
    
    return document.id;
    
  } catch (error) {
    console.error('❌ Error creating test document:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestDocument().catch(console.error);
