module tb;
  reg a = 1'b1;
  reg oe = 1'b1;
  wire w_1;
  tri_not_sanitized dut(.a(a), .oe(oe), .w_1(w_1));
  initial begin
    #1;
    $display("Y=%b", w_1);
    $finish;
  end
endmodule
