import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new document collection
   */
  async createCollection(userId: string, name: string, description?: string) {
    // Check if collection with same name exists for user
    const existing = await this.prisma.documentCollection.findFirst({
      where: { userId, name },
    });

    if (existing) {
      throw new BadRequestException(`Collection "${name}" already exists`);
    }

    const collection = await this.prisma.documentCollection.create({
      data: {
        userId,
        name,
        description,
      },
      include: {
        documents: {
          include: {
            document: {
              select: {
                id: true,
                fileName: true,
                pageCount: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return collection;
  }

  /**
   * Get all collections for a user
   */
  async getUserCollections(userId: string, limit: number = 50, offset: number = 0) {
    const [collections, total] = await Promise.all([
      this.prisma.documentCollection.findMany({
        where: { userId },
        include: {
          documents: {
            include: {
              document: {
                select: {
                  id: true,
                  fileName: true,
                  pageCount: true,
                  createdAt: true,
                },
              },
            },
          },
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.documentCollection.count({ where: { userId } }),
    ]);

    return {
      collections,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a specific collection by ID
   */
  async getCollectionById(collectionId: string, userId: string) {
    const collection = await this.prisma.documentCollection.findFirst({
      where: { id: collectionId, userId },
      include: {
        documents: {
          include: {
            document: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                pageCount: true,
                ocrApplied: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: { documents: true, chats: true },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  /**
   * Update collection details
   */
  async updateCollection(
    collectionId: string,
    userId: string,
    name?: string,
    description?: string,
  ) {
    // Verify ownership
    const collection = await this.prisma.documentCollection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check name uniqueness if changing name
    if (name && name !== collection.name) {
      const existing = await this.prisma.documentCollection.findFirst({
        where: { userId, name },
      });

      if (existing) {
        throw new BadRequestException(`Collection "${name}" already exists`);
      }
    }

    const updated = await this.prisma.documentCollection.update({
      where: { id: collectionId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        documents: {
          include: {
            document: {
              select: {
                id: true,
                fileName: true,
                pageCount: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionId: string, userId: string) {
    // Verify ownership
    const collection = await this.prisma.documentCollection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.prisma.documentCollection.delete({
      where: { id: collectionId },
    });

    return { message: 'Collection deleted successfully' };
  }

  /**
   * Add documents to a collection
   */
  async addDocumentsToCollection(
    collectionId: string,
    userId: string,
    documentIds: string[],
  ) {
    // Verify collection ownership
    const collection = await this.prisma.documentCollection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Verify all documents belong to user
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: documentIds },
        userId,
        isDeleted: false,
      },
    });

    if (documents.length !== documentIds.length) {
      throw new BadRequestException('Some documents not found or do not belong to user');
    }

    // Get existing document IDs in collection
    const existing = await this.prisma.collectionDocument.findMany({
      where: { collectionId },
      select: { documentId: true },
    });

    const existingIds = new Set(existing.map((d) => d.documentId));
    const newDocumentIds = documentIds.filter((id) => !existingIds.has(id));

    if (newDocumentIds.length === 0) {
      return {
        message: 'All documents already in collection',
        addedCount: 0,
      };
    }

    // Add documents to collection
    await this.prisma.collectionDocument.createMany({
      data: newDocumentIds.map((documentId) => ({
        collectionId,
        documentId,
      })),
    });

    return {
      message: `Added ${newDocumentIds.length} document(s) to collection`,
      addedCount: newDocumentIds.length,
      skippedCount: documentIds.length - newDocumentIds.length,
    };
  }

  /**
   * Remove a document from a collection
   */
  async removeDocumentFromCollection(
    collectionId: string,
    documentId: string,
    userId: string,
  ) {
    // Verify collection ownership
    const collection = await this.prisma.documentCollection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Remove document from collection
    const result = await this.prisma.collectionDocument.deleteMany({
      where: {
        collectionId,
        documentId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Document not found in collection');
    }

    return { message: 'Document removed from collection' };
  }

  /**
   * Get all documents in a collection
   */
  async getCollectionDocuments(collectionId: string, userId: string) {
    // Verify collection ownership
    const collection = await this.prisma.documentCollection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const documents = await this.prisma.collectionDocument.findMany({
      where: { collectionId },
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            pageCount: true,
            ocrApplied: true,
            ocrLanguages: true,
            createdAt: true,
            _count: {
              select: { embeddings: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((cd) => cd.document);
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionId: string, userId: string) {
    // Verify collection ownership
    const collection = await this.prisma.documentCollection.findFirst({
      where: { id: collectionId, userId },
      include: {
        _count: {
          select: {
            documents: true,
            chats: true,
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Get total pages and embeddings
    const documents = await this.prisma.collectionDocument.findMany({
      where: { collectionId },
      include: {
        document: {
          select: {
            pageCount: true,
            _count: {
              select: { embeddings: true },
            },
          },
        },
      },
    });

    const totalPages = documents.reduce((sum, d) => sum + d.document.pageCount, 0);
    const totalEmbeddings = documents.reduce(
      (sum, d) => sum + d.document._count.embeddings,
      0,
    );

    return {
      collectionId,
      name: collection.name,
      description: collection.description,
      totalDocuments: collection._count.documents,
      totalPages,
      totalEmbeddings,
      totalChats: collection._count.chats,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }
}
