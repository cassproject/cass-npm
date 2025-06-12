const { expect } = require('chai');
const EcDirectedGraph = require('../com/eduworks/ec/graph/EcDirectedGraph');

describe('EcDirectedGraph', () => {
    let graph;
    let vertex1, vertex2, vertex3, edge1, edge2;

    beforeEach(() => {
        graph = new EcDirectedGraph();
        vertex1 = { equals: (v) => v === vertex1 };
        vertex2 = { equals: (v) => v === vertex2 };
        vertex3 = { equals: (v) => v === vertex3 };
        edge1 = { equals: (e) => e === edge1 };
        edge2 = { equals: (e) => e === edge2 };
    });

    it('should add vertices', () => {
        graph.addVertex(vertex1);
        graph.addVertex(vertex2);
        expect(graph.getVertexCount()).to.equal(2);
        expect(graph.containsVertex(vertex1)).to.be.true;
        expect(graph.containsVertex(vertex2)).to.be.true;
    });

    it('should add edges', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.getEdgeCount()).to.equal(1);
        expect(graph.containsEdge(edge1)).to.be.true;
    });

    it('should find edges between vertices', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.findEdge(vertex1, vertex2)).to.equal(edge1);
    });

    it('should get neighbors of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex1, vertex3);
        expect(graph.getNeighbors(vertex1)).to.have.members([vertex2, vertex3]);
    });

    it('should get incident edges of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex1, vertex3);
        expect(graph.getIncidentEdges(vertex1)).to.have.members([edge1, edge2]);
    });

    it('should get incident vertices of an edge', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.getIncidentVertices(edge1)).to.have.members([vertex1, vertex2]);
    });

    it('should remove vertices', () => {
        graph.addVertex(vertex1);
        graph.addVertex(vertex2);
        graph.removeVertex(vertex1);
        expect(graph.getVertexCount()).to.equal(1);
        expect(graph.containsVertex(vertex1)).to.be.false;
    });

    it('should remove edges', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.removeEdge(edge1);
        expect(graph.getEdgeCount()).to.equal(0);
        expect(graph.containsEdge(edge1)).to.be.false;
    });

    it('should check if vertices are neighbors', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.isNeighbor(vertex1, vertex2)).to.be.true;
        expect(graph.isNeighbor(vertex1, vertex3)).to.be.false;
    });

    it('should check if a vertex is incident to an edge', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.isIncident(vertex1, edge1)).to.be.true;
        expect(graph.isIncident(vertex3, edge1)).to.be.false;
    });

    it('should get the degree of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex1, vertex3);
        expect(graph.degree(vertex1)).to.equal(2);
    });

    it('should get the in-degree of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex3, vertex2);
        expect(graph.inDegree(vertex2)).to.equal(2);
    });

    it('should get the out-degree of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex1, vertex3);
        expect(graph.outDegree(vertex1)).to.equal(2);
    });

    it('should get the source of a directed edge', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.getSource(edge1)).to.equal(vertex1);
    });

    it('should get the destination of a directed edge', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.getDest(edge1)).to.equal(vertex2);
    });

    it('should get predecessors of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex3, vertex2);
        expect(graph.getPredecessors(vertex2)).to.have.members([vertex1,vertex3]);
    });

    it('should get successors of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex1, vertex3);
        expect(graph.getSuccessors(vertex1)).to.have.members([vertex2,vertex3]);
    });

    it('should check if a vertex is a predecessor of another vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.isPredecessor(vertex2, vertex1)).to.be.true;
        expect(graph.isPredecessor(vertex1, vertex2)).to.be.false;
    });

    it('should check if a vertex is a successor of another vertex', () => {
        graph.addEdge(edge1, vertex2, vertex1);
        expect(graph.isSuccessor(vertex2, vertex1)).to.be.true;
        expect(graph.isSuccessor(vertex1, vertex2)).to.be.false;
    });

    it('should get the predecessor count of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex3, vertex2);
        expect(graph.getPredecessorCount(vertex2)).to.equal(2);
    });

    it('should get the successor count of a vertex', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        graph.addEdge(edge2, vertex1, vertex3);
        expect(graph.getSuccessorCount(vertex1)).to.equal(2);
    });

    it('should check if a vertex is the source of an edge', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.isSource(vertex1, edge1)).to.be.true;
        expect(graph.isSource(vertex2, edge1)).to.be.false;
    });

    it('should check if a vertex is the destination of an edge', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.isDest(vertex2, edge1)).to.be.true;
        expect(graph.isDest(vertex1, edge1)).to.be.false;
    });

    it('should get the opposite vertex of an edge', () => {
        graph.addEdge(edge1, vertex1, vertex2);
        expect(graph.getOpposite(vertex1, edge1)).to.equal(vertex2);
        expect(graph.getOpposite(vertex2, edge1)).to.equal(vertex1);
    });
});