const EcArray = require("../array/EcArray.js");
const Graph = require("./Graph.js");
const Triple = require("./Triple.js");
/**
 *  A directed implementation of {{#crossLink "Graph"}}Graph{{/crossLink}}. Edges have types. Two vertices may have many edges between them.
 *
 *  @param <V>
 *  @param <E>
 *  @author fray
 *  @class EcDirectedGraph
 *  @module com.eduworks.ec
 *  @extends Graph
 */
module.exports = class EcDirectedGraph extends Graph {
	edges = [];
	verticies = [];
	getEdges() {
		let results = [];
		for (let i = 0; i < this.edges.length; i++)
			results[i] = this.edges[i].edge;
		return results;
	}
	getVertices() {
		let results = [];
		for (let i = 0; i < this.verticies.length; i++)
			results[i] = this.verticies[i];
		return results;
	}
	containsVertex(vertex) {
		for (let vertex2 of this.verticies)
			if (vertex.equals(vertex2)) return true;
		return false;
	}
	containsEdge(edge) {
		for (let edge2 of this.edges)
			if (edge.equals(edge2.edge)) return true;
		return false;
	}
	getEdgeCount() {
		return this.edges.length;
	}
	getVertexCount() {
		return this.verticies.length;
	}
	getNeighbors(vertex) {
		let results = [];
		for (let edge2 of this.edges) {
			if (vertex.equals(edge2.source))
				results.push(edge2.destination);
			else if (vertex.equals(edge2.destination))
				results.push(edge2.source);
		}
		EcArray.removeDuplicates(results);
		return results;
	}
	getIncidentEdges(vertex) {
		let results = [];
		for (let edge2 of this.edges) {
			if (vertex.equals(edge2.source) || vertex.equals(edge2.destination))
				results.push(edge2.edge);
		}
		EcArray.removeDuplicates(results);
		return results;
	}
	getIncidentVertices(edge) {
		let results = [];
		for (let edge2 of this.edges) {
			if (edge.equals(edge2.edge)) {
				results.push(edge2.source, edge2.destination);
			}
		}
		EcArray.removeDuplicates(results);
		return results;
	}
	findEdge(v1, v2) {
		for (let edge2 of this.edges) {
			if (
				v1.equals(edge2.source) &&
				v2.equals(edge2.destination)
			)
				return edge2.edge;
			if (
				v1.equals(edge2.destination) &&
				v2.equals(edge2.source)
			)
				return edge2.edge;
		}
		return null;
	}
	findEdgeSet(v1, v2) {
		let results = [];
		for (let edge2 of this.edges) {
			if (
				v1.equals(edge2.source) &&
				v2.equals(edge2.destination)
			)
				results.push(edge2.edge);
			if (
				v1.equals(edge2.destination) &&
				v2.equals(edge2.source)
			)
				results.push(edge2.edge);
		}
		return results;
	}
	addVertex(vertex) {
		this.verticies.push(vertex);
		return true;
	}
	addVertexSafely(vertex) {
		if (EcArray.has(this.verticies, vertex)) 
			return false;
		this.verticies.push(vertex);
		return true;
	}
	removeVertex(vertex) {
		let indexOf = EcArray.indexOf(this.verticies, vertex);
		if (indexOf != -1) {
			for (let i = 0; i < this.edges.length; i++) {
				if (
					this.edges[i].source.equals(vertex) ||
					this.edges[i].destination.equals(vertex)
				) {
					this.edges.splice(i--, 1); //NOSONAR It's fine.
				}
			}
			this.verticies.splice(indexOf, 1);
			return true;
		}
		return false;
	}
	removeEdge(edge) {
		let success = false;
		for (let i = 0; i < this.edges.length; i++) {
			if (this.edges[i].edge.equals(edge)) {
				this.edges.splice(i--, 1); //NOSONAR It's fine.
				success = true;
			}
		}
		return success;
	}
	isNeighbor(v1, v2) {
		for (let edge2 of this.edges) {
			if ((v1.equals(edge2.source) && v2.equals(edge2.destination)) || (v1.equals(edge2.destination) && v2.equals(edge2.source)))
				return true;
		}
		return false;
	}
	isIncident(vertex, edge) {
		for (let edge2 of this.edges) {
			if (
				(vertex.equals(edge2.source) ||
					vertex.equals(edge2.destination)) &&
				edge.equals(edge2.edge)
			)
				return true;
		}
		return false;
	}
	degree(vertex) {
		let count = 0;
		for (let edge2 of this.edges) {
			if (
				vertex.equals(edge2.source) ||
				vertex.equals(edge2.destination)
			)
				count++;
		}
		return count;
	}
	getNeighborCount(vertex) {
		return this.getNeighbors(vertex).length;
	}
	getIncidentCount(edge) {
		return this.getIncidentVertices(edge).length;
	}
	getEdgeType(edge) { } //NOSONAR -- This is a stub method.
	getDefaultEdgeType() { } //NOSONAR -- This is a stub method.
	getEdgesOfType(edge_type) {
		let results = [];
		for (let edge2 of this.edges) {
			if (this.getEdgeType(edge2.edge) == edge_type)
				results.push(edge2.edge);
		}
		return results;
	}
	getEdgeCountOfType(edge_type) {
		return this.getEdgesOfType(edge_type).length;
	}
	getInEdges(vertex) {
		let results = [];
		for (let edge2 of this.edges) {
			if (vertex.equals(edge2.destination))
				results.push(edge2.edge);
		}
		EcArray.removeDuplicates(results);
		return results;
	}
	getOutEdges(vertex) {
		let results = [];
		for (let edge2 of this.edges) {
			if (vertex.equals(edge2.source))
				results.push(edge2.edge);
		}
		EcArray.removeDuplicates(results);
		return results;
	}
	inDegree(vertex) {
		return this.getInEdges(vertex).length;
	}
	outDegree(vertex) {
		return this.getOutEdges(vertex).length;
	}
	getSource(directed_edge) {
		for (let edge2 of this.edges) {
			if (directed_edge.equals(edge2.edge))
				return edge2.source;
		}
		return null;
	}
	getDest(directed_edge) {
		for (let edge2 of this.edges) {
			if (directed_edge.equals(edge2.edge))
				return edge2.destination;
		}
		return null;
	}
	getPredecessors(vertex) {
		let results = [];
		for (let edge2 of this.edges) {
			if (vertex.equals(edge2.destination))
				results.push(edge2.source);
		}
		EcArray.removeDuplicates(results);
		return results;
	}
	getSuccessors(vertex) {
		let results = [];
		for (let edge2 of this.edges) {
			if (vertex.equals(edge2.source))
				results.push(edge2.destination);
		}
		EcArray.removeDuplicates(results);
		return results;
	}
	isPredecessor(v1, v2) {
		for (let edge2 of this.edges) {
			if (v1.equals(edge2.destination))
				if (v2.equals(edge2.source)) return true;
		}
		return false;
	}
	isSuccessor(v1, v2) {
		for (let edge2 of this.edges) {
			if (v2.equals(edge2.destination))
				if (v1.equals(edge2.source)) return true;
		}
		return false;
	}
	getPredecessorCount(vertex) {
		return this.getPredecessors(vertex).length;
	}
	getSuccessorCount(vertex) {
		return this.getSuccessors(vertex).length;
	}
	isSource(vertex, edge) {
		for (let edge2 of this.edges) {
			if (edge.equals(edge2.edge))
				if (vertex.equals(edge2.source)) return true;
		}
		return false;
	}
	isDest(vertex, edge) {
		for (let edge2 of this.edges) {
			if (edge.equals(edge2.edge))
				if (vertex.equals(edge2.destination)) return true;
		}
		return false;
	}
	addEdge(e, v1, v2) {
		this.addVertexSafely(v1);
		this.addVertexSafely(v2);
		let t = new Triple();
		t.source = v1;
		t.destination = v2;
		t.edge = e;
		this.edges.push(t);
		return true;
	}
	addEdgeUnsafely(e, v1, v2) {
		let t = new Triple();
		t.source = v1;
		t.destination = v2;
		t.edge = e;
		this.edges.push(t);
		return true;
	}
	addEdgeSafely(e, v1, v2) {
		this.addVertexSafely(v1);
		this.addVertexSafely(v2);
		let t = new Triple();
		t.source = v1;
		t.destination = v2;
		t.edge = e;
		if (EcArray.has(this.edges, t)) return false;
		this.edges.push(t);
		return true;
	}
	getOpposite(vertex, edge) {
		for (let edge2 of this.edges) {
			if (edge.equals(edge2.edge))
				if (vertex.equals(edge2.destination))
					return edge2.source;
				else if (vertex.equals(edge2.source))
					return edge2.destination;
		}
		return null;
	}
};
